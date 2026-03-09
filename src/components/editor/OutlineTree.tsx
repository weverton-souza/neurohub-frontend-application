import { useState, useCallback, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Block, BlockData, TextBlockData } from '@/types'
import { BLOCK_TYPE_LABELS } from '@/types'
import { computeBlockMetas } from '@/lib/utils'
import { PlusIcon } from '@/components/icons'
import OutlineRow from '@/components/editor/OutlineRow'
import SectionDeleteModal from '@/components/ui/SectionDeleteModal'

interface OutlineTreeProps {
  blocks: Block[]
  onBlocksChange: (blocks: Block[]) => void
  collapsedSections: Set<string>
  onToggleSectionCollapse: (sectionBlockId: string) => void
  onRequestAddBlock: (afterBlockId: string) => void
  onEditBlock: (blockId: string) => void
}

// 3-level hierarchy
interface SubsectionGroup {
  subsectionBlock: Block // text block with subtitle only
  children: Block[]      // tables, charts, etc.
}

interface SectionGroup {
  sectionBlockId: string
  sectionTitle: string
  sectionBlock: Block | null
  directChildren: Block[]       // blocks between section start and first subsection
  subsections: SubsectionGroup[]
}

function isSubsectionBlock(block: Block): boolean {
  if (block.type !== 'text') return false
  const d = block.data as TextBlockData
  return !d.title && !!d.subtitle
}

// Chevron SVG used in multiple places
function Chevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function OutlineTree({
  blocks,
  onBlocksChange,
  collapsedSections,
  onToggleSectionCollapse,
  onRequestAddBlock,
  onEditBlock,
}: OutlineTreeProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = blocks.findIndex((b) => b.id === active.id)
      const newIndex = blocks.findIndex((b) => b.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      const newBlocks = [...blocks]
      const [moved] = newBlocks.splice(oldIndex, 1)
      newBlocks.splice(newIndex, 0, moved)

      const reordered = newBlocks.map((b, i) => ({ ...b, order: i }))
      onBlocksChange(reordered)
    },
    [blocks, onBlocksChange]
  )

  const updateBlockData = useCallback(
    (blockId: string, newData: BlockData) => {
      const updated = blocks.map((b) =>
        b.id === blockId ? { ...b, data: newData } : b
      )
      onBlocksChange(updated)
    },
    [blocks, onBlocksChange]
  )

  const duplicateBlock = useCallback(
    (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId)
      if (!block) return

      const blockIndex = blocks.findIndex((b) => b.id === blockId)
      const newBlock: Block = {
        ...block,
        id: crypto.randomUUID(),
        data: JSON.parse(JSON.stringify(block.data)),
        collapsed: false,
      }

      const newBlocks = [...blocks]
      newBlocks.splice(blockIndex + 1, 0, newBlock)
      const reordered = newBlocks.map((b, i) => ({ ...b, order: i }))
      onBlocksChange(reordered)
    },
    [blocks, onBlocksChange]
  )

  const removeBlock = useCallback(
    (blockId: string) => {
      const filtered = blocks.filter((b) => b.id !== blockId)
      const reordered = filtered.map((b, i) => ({ ...b, order: i }))
      onBlocksChange(reordered)
    },
    [blocks, onBlocksChange]
  )

  // --- Section cascading delete ---
  const [sectionDeleteTarget, setSectionDeleteTarget] = useState<{
    sectionBlockId: string
    sectionTitle: string
    childBlockIds: string[]
  } | null>(null)

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order - b.order),
    [blocks]
  )
  const blockMetas = useMemo(() => computeBlockMetas(sortedBlocks), [sortedBlocks])

  // Build 3-level hierarchy: section → subsection → leaf
  const sectionGroups = useMemo(() => {
    const groups: SectionGroup[] = []
    let currentGroup: SectionGroup | null = null
    let currentSubsection: SubsectionGroup | null = null

    for (const block of sortedBlocks) {
      const meta = blockMetas[block.id]
      if (!meta) continue

      if (meta.isSection) {
        // New section
        currentSubsection = null
        currentGroup = {
          sectionBlockId: block.id,
          sectionTitle: meta.sectionTitle,
          sectionBlock: block,
          directChildren: [],
          subsections: [],
        }
        groups.push(currentGroup)
      } else if (isSubsectionBlock(block)) {
        // New subsection within current section
        if (!currentGroup) {
          // Orphan subsection — create a section for it
          currentGroup = {
            sectionBlockId: block.id,
            sectionTitle: BLOCK_TYPE_LABELS[block.type],
            sectionBlock: null,
            directChildren: [],
            subsections: [],
          }
          groups.push(currentGroup)
        }
        currentSubsection = {
          subsectionBlock: block,
          children: [],
        }
        currentGroup.subsections.push(currentSubsection)
      } else if (currentSubsection) {
        // Leaf block inside a subsection
        currentSubsection.children.push(block)
      } else if (currentGroup) {
        // Block directly under section (no subsection yet)
        currentGroup.directChildren.push(block)
      } else {
        // Orphan block before any section
        groups.push({
          sectionBlockId: block.id,
          sectionTitle: BLOCK_TYPE_LABELS[block.type],
          sectionBlock: null,
          directChildren: [block],
          subsections: [],
        })
      }
    }

    return groups
  }, [sortedBlocks, blockMetas])

  // Find the last block ID in a section group (for inserting at end)
  function getLastBlockIdInSection(group: SectionGroup): string {
    const subs = group.subsections
    if (subs.length > 0) {
      const lastSub = subs[subs.length - 1]
      if (lastSub.children.length > 0) return lastSub.children[lastSub.children.length - 1].id
      return lastSub.subsectionBlock.id
    }
    if (group.directChildren.length > 0) return group.directChildren[group.directChildren.length - 1].id
    return group.sectionBlockId
  }

  // Find the last block ID in a subsection group (for inserting at end)
  function getLastBlockIdInSubsection(sub: SubsectionGroup): string {
    if (sub.children.length > 0) return sub.children[sub.children.length - 1].id
    return sub.subsectionBlock.id
  }

  // Count all children (direct + subsections + their children)
  function countSectionChildren(group: SectionGroup): number {
    let count = group.directChildren.length
    for (const sub of group.subsections) {
      count += 1 + sub.children.length // subsection block + its children
    }
    return count
  }

  // Collect all child IDs for a section group
  function collectChildIds(group: SectionGroup): string[] {
    const ids: string[] = []
    ids.push(...group.directChildren.map((b) => b.id))
    for (const sub of group.subsections) {
      ids.push(sub.subsectionBlock.id)
      ids.push(...sub.children.map((b) => b.id))
    }
    return ids
  }

  // Intercept remove: show modal for sections with children
  const handleRemoveRequest = useCallback(
    (blockId: string) => {
      // Check if it's a section with children
      const group = sectionGroups.find((g) => g.sectionBlockId === blockId && g.sectionBlock)
      if (group) {
        const childCount = countSectionChildren(group)
        if (childCount > 0) {
          setSectionDeleteTarget({
            sectionBlockId: blockId,
            sectionTitle: group.sectionTitle,
            childBlockIds: collectChildIds(group),
          })
          return
        }
      }
      // Also check subsections with children
      for (const g of sectionGroups) {
        const sub = g.subsections.find((s) => s.subsectionBlock.id === blockId)
        if (sub && sub.children.length > 0) {
          const d = sub.subsectionBlock.data as TextBlockData
          setSectionDeleteTarget({
            sectionBlockId: blockId,
            sectionTitle: d.subtitle || 'Subseção',
            childBlockIds: sub.children.map((b) => b.id),
          })
          return
        }
      }
      // Not a section or no children — remove directly
      removeBlock(blockId)
    },
    [sectionGroups, removeBlock]
  )

  // Delete section + all children
  const handleDeleteAll = useCallback(() => {
    if (!sectionDeleteTarget) return
    const idsToRemove = new Set([sectionDeleteTarget.sectionBlockId, ...sectionDeleteTarget.childBlockIds])
    const filtered = blocks.filter((b) => !idsToRemove.has(b.id))
    const reordered = filtered.map((b, i) => ({ ...b, order: i }))
    onBlocksChange(reordered)
    setSectionDeleteTarget(null)
  }, [blocks, onBlocksChange, sectionDeleteTarget])

  // Move children to target section, then delete the section block
  const handleMoveAndDelete = useCallback(
    (targetSectionId: string) => {
      if (!sectionDeleteTarget) return
      const sorted = [...blocks].sort((a, b) => a.order - b.order)

      // Find the last block in the target section
      const targetGroup = sectionGroups.find((g) => g.sectionBlockId === targetSectionId)
      if (!targetGroup) return

      const targetAllIds: string[] = [targetGroup.sectionBlockId]
      targetAllIds.push(...targetGroup.directChildren.map((b) => b.id))
      for (const sub of targetGroup.subsections) {
        targetAllIds.push(sub.subsectionBlock.id)
        targetAllIds.push(...sub.children.map((b) => b.id))
      }
      const lastTargetIndex = Math.max(...targetAllIds.map((id) => sorted.findIndex((b) => b.id === id)))

      const childBlockIds = new Set(sectionDeleteTarget.childBlockIds)
      const childBlocks = sorted.filter((b) => childBlockIds.has(b.id))
      const remaining = sorted.filter(
        (b) => b.id !== sectionDeleteTarget.sectionBlockId && !childBlockIds.has(b.id)
      )

      const lastTargetBlock = sorted[lastTargetIndex]
      const insertIndex = remaining.findIndex((b) => b.id === lastTargetBlock.id) + 1
      remaining.splice(insertIndex, 0, ...childBlocks)

      const reordered = remaining.map((b, i) => ({ ...b, order: i }))
      onBlocksChange(reordered)
      setSectionDeleteTarget(null)
    },
    [blocks, onBlocksChange, sectionGroups, sectionDeleteTarget]
  )

  // Target sections for move (all sections except the one being deleted)
  const deleteTargetSections = useMemo(() => {
    if (!sectionDeleteTarget) return []
    return sectionGroups
      .filter((g) => g.sectionBlock && g.sectionBlockId !== sectionDeleteTarget.sectionBlockId)
      .map((g) => ({ value: g.sectionBlockId, label: g.sectionTitle }))
  }, [sectionGroups, sectionDeleteTarget])

  if (sortedBlocks.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <svg
          className="mx-auto mb-4 text-gray-300"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <p className="text-sm">Nenhum bloco adicionado.</p>
        <p className="text-xs mt-1">
          Clique em "Adicionar Seção" para começar.
        </p>
      </div>
    )
  }

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedBlocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {sectionGroups.map((group) => {
            const isSectionCollapsed = collapsedSections.has(group.sectionBlockId)
            const childCount = countSectionChildren(group)
            const hasChildren = childCount > 0
            const hasLevel1Items = group.directChildren.length > 0 || group.subsections.length > 0
            // Sections that don't allow adding blocks inside them
            const sectionType = group.sectionBlock?.type
            const isRestrictedSection = sectionType === 'identification' || sectionType === 'closing-page'

            return (
              <div key={group.sectionBlockId}>
                {/* === Level 0: Section header === */}
                {group.sectionBlock && (
                  <div className="flex items-center group/section">
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => onToggleSectionCollapse(group.sectionBlockId)}
                        className="p-1 rounded hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                      >
                        <Chevron collapsed={isSectionCollapsed} />
                      </button>
                    ) : (
                      <span className="w-6 shrink-0" />
                    )}

                    {/* Add block inside section (hidden for identification/closing-page) */}
                    {!isRestrictedSection && (
                      <button
                        type="button"
                        onClick={() => onRequestAddBlock(getLastBlockIdInSection(group))}
                        className="p-1 rounded-md text-gray-300 hover:text-brand-600 hover:bg-white/60 transition-all shrink-0 opacity-0 group-hover/section:opacity-100"
                        title="Adicionar bloco na seção"
                      >
                        <PlusIcon size={14} />
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      <OutlineRow
                        block={group.sectionBlock}
                        meta={blockMetas[group.sectionBlock.id]}
                        level={0}
                        onEdit={onEditBlock}
                        onDuplicate={duplicateBlock}
                        onRemove={handleRemoveRequest}
                        onChange={updateBlockData}
                      />
                    </div>

                    {isSectionCollapsed && childCount > 0 && (
                      <span className="text-xs text-gray-400 px-2 shrink-0">
                        {childCount}
                      </span>
                    )}
                  </div>
                )}

                {/* === Level-1 children with tree connecting lines === */}
                {!isSectionCollapsed && hasLevel1Items && (
                  <div className="tree-children">
                    {/* Direct children (level 1) */}
                    {group.directChildren.map((block) => (
                      <div key={block.id} className="tree-node">
                        <div className="flex items-center">
                          <span className="w-6 shrink-0" />
                          <span className="w-6 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <OutlineRow
                              block={block}
                              meta={blockMetas[block.id]}
                              level={1}
                              onEdit={onEditBlock}
                              onDuplicate={duplicateBlock}
                              onRemove={handleRemoveRequest}
                              onChange={updateBlockData}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Subsections (level 1) */}
                    {group.subsections.map((sub) => {
                      const isSubCollapsed = collapsedSections.has(sub.subsectionBlock.id)
                      const hasSubChildren = sub.children.length > 0

                      return (
                        <div key={sub.subsectionBlock.id} className="tree-node">
                          {/* Subsection header */}
                          <div className="flex items-center group/sub">
                            {hasSubChildren ? (
                              <button
                                type="button"
                                onClick={() => onToggleSectionCollapse(sub.subsectionBlock.id)}
                                className="p-1 rounded hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                              >
                                <Chevron collapsed={isSubCollapsed} />
                              </button>
                            ) : (
                              <span className="w-6 shrink-0" />
                            )}

                            {/* Add block inside subsection */}
                            <button
                              type="button"
                              onClick={() => onRequestAddBlock(getLastBlockIdInSubsection(sub))}
                              className="p-1 rounded-md text-gray-300 hover:text-brand-600 hover:bg-white/60 transition-all shrink-0 opacity-0 group-hover/sub:opacity-100"
                              title="Adicionar bloco na subseção"
                            >
                              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                              </svg>
                            </button>

                            <div className="flex-1 min-w-0">
                              <OutlineRow
                                block={sub.subsectionBlock}
                                meta={blockMetas[sub.subsectionBlock.id]}
                                level={1}
                                onEdit={onEditBlock}
                                onDuplicate={duplicateBlock}
                                onRemove={handleRemoveRequest}
                                onChange={updateBlockData}
                              />
                            </div>

                            {isSubCollapsed && hasSubChildren && (
                              <span className="text-xs text-gray-400 px-2 shrink-0">
                                {sub.children.length}
                              </span>
                            )}
                          </div>

                          {/* === Level 2: Leaf blocks with nested tree lines === */}
                          {!isSubCollapsed && hasSubChildren && (
                            <div className="tree-children">
                              {sub.children.map((leaf) => (
                                <div key={leaf.id} className="tree-node">
                                  <div className="flex items-center">
                                    <span className="w-6 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <OutlineRow
                                        block={leaf}
                                        meta={blockMetas[leaf.id]}
                                        level={2}
                                        onEdit={onEditBlock}
                                        onDuplicate={duplicateBlock}
                                        onRemove={handleRemoveRequest}
                                        onChange={updateBlockData}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Hidden children for DnD when subsection is collapsed */}
                          {isSubCollapsed && sub.children.map((leaf) => (
                            <div key={leaf.id} className="hidden">
                              <OutlineRow
                                block={leaf}
                                meta={blockMetas[leaf.id]}
                                level={2}
                                onEdit={onEditBlock}
                                onDuplicate={duplicateBlock}
                                onRemove={handleRemoveRequest}
                                onChange={updateBlockData}
                              />
                            </div>
                          ))}

                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Hidden section children for DnD when section is collapsed */}
                {isSectionCollapsed && (
                  <>
                    {group.directChildren.map((block) => (
                      <div key={block.id} className="hidden">
                        <OutlineRow
                          block={block}
                          meta={blockMetas[block.id]}
                          level={1}
                          onEdit={onEditBlock}
                          onDuplicate={duplicateBlock}
                          onRemove={handleRemoveRequest}
                          onChange={updateBlockData}
                        />
                      </div>
                    ))}
                    {group.subsections.map((sub) => (
                      <div key={sub.subsectionBlock.id} className="hidden">
                        <OutlineRow
                          block={sub.subsectionBlock}
                          meta={blockMetas[sub.subsectionBlock.id]}
                          level={1}
                          onEdit={onEditBlock}
                          onDuplicate={duplicateBlock}
                          onRemove={handleRemoveRequest}
                          onChange={updateBlockData}
                        />
                        {sub.children.map((leaf) => (
                          <OutlineRow
                            key={leaf.id}
                            block={leaf}
                            meta={blockMetas[leaf.id]}
                            level={2}
                            onEdit={onEditBlock}
                            onDuplicate={duplicateBlock}
                            onRemove={handleRemoveRequest}
                            onChange={updateBlockData}
                          />
                        ))}
                      </div>
                    ))}
                  </>
                )}

              </div>
            )
          })}
        </div>
      </SortableContext>
    </DndContext>

    <SectionDeleteModal
      isOpen={!!sectionDeleteTarget}
      onClose={() => setSectionDeleteTarget(null)}
      sectionTitle={sectionDeleteTarget?.sectionTitle ?? ''}
      childCount={sectionDeleteTarget?.childBlockIds.length ?? 0}
      targetSections={deleteTargetSections}
      onDeleteAll={handleDeleteAll}
      onMoveAndDelete={handleMoveAndDelete}
    />
    </>
  )
}
