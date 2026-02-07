import { MenuStrategy, LayoutSection, LayoutItem } from './strategy.service';

export interface BuiltLayout {
  id: string;
  strategyId: string;
  strategyName: string;
  html: string;
  css: string;
  sections: LayoutSection[];
  metadata: {
    createdAt: string;
    version: number;
    experimentId?: string;
  };
}

/**
 * Menu Engineering Layout Rules (from strategy-context.json):
 * 1. Stars at top of each category
 * 2. Puzzles in high-visibility spots with enhanced descriptions
 * 3. Avoid burying high-margin items mid-scroll
 * 4. Visual anchors (badges, highlights) on max 30% of items
 * 5. Limit items per screen to 7 without visual break
 * 6. Featured section: 3-5 items maximum
 * 7. Remove currency symbols for hidden-dollar style
 * 8. Use sensory language in descriptions
 */

/**
 * Layout Builder Agent
 * Takes a selected strategy and builds a deployable menu layout
 * following menu engineering principles for maximum profitability
 */
export class LayoutBuilderAgent {
  /**
   * Build a complete layout from a strategy
   */
  static async buildLayout(strategy: MenuStrategy, experimentId?: string): Promise<BuiltLayout> {
    const { layout } = strategy;

    // Apply menu engineering rules to sections
    const optimizedSections = this.applyMenuEngineeringRules(layout.sections);

    // Generate CSS based on strategy
    const css = this.generateCSS(layout);

    // Generate HTML structure with optimized sections
    const html = this.generateHTML({ ...layout, sections: optimizedSections }, strategy.name);

    return {
      id: `layout-${Date.now()}`,
      strategyId: strategy.id,
      strategyName: strategy.name,
      html,
      css,
      sections: optimizedSections,
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1,
        experimentId,
      },
    };
  }

  /**
   * Apply menu engineering rules to sections
   */
  private static applyMenuEngineeringRules(sections: LayoutSection[]): LayoutSection[] {
    let totalHighlightedItems = 0;
    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
    const maxHighlighted = Math.ceil(totalItems * 0.3); // Max 30% highlighted

    return sections.map((section) => {
      // Sort items by quadrant: Stars → Puzzles → Plowhorses → Dogs
      const sortedItems = this.sortByQuadrant(section.items);

      // Apply highlighting rules (max 30% of items)
      const processedItems = sortedItems.map((item, idx) => {
        const newItem = { ...item };

        // First item in each category should be highlighted (if it's a Star or Puzzle)
        if (idx === 0 && (item.quadrant === 'star' || item.quadrant === 'puzzle')) {
          if (totalHighlightedItems < maxHighlighted) {
            newItem.isHighlighted = true;
            totalHighlightedItems++;
          }
        }

        // Add appropriate badges based on quadrant
        if (item.quadrant === 'star' && !newItem.badges.includes('Most Ordered')) {
          newItem.badges = [...newItem.badges, 'Most Ordered'];
        } else if (item.quadrant === 'puzzle' && !newItem.badges.some(b => b.includes('Pick') || b.includes('Special'))) {
          newItem.badges = [...newItem.badges, "Chef's Pick"];
        }

        return newItem;
      });

      return {
        ...section,
        items: processedItems,
      };
    });
  }

  /**
   * Sort items by quadrant priority
   */
  private static sortByQuadrant(items: LayoutItem[]): LayoutItem[] {
    const order: Record<string, number> = { star: 1, puzzle: 2, plowhorse: 3, dog: 4 };
    return [...items].sort((a, b) => {
      const orderA = a.quadrant ? order[a.quadrant] : 3;
      const orderB = b.quadrant ? order[b.quadrant] : 3;
      return orderA - orderB;
    });
  }

  /**
   * Generate CSS for the layout
   * Implements menu engineering UX safeguards:
   * - Fast loading (optimized CSS)
   * - Clear CTA buttons
   * - Easy navigation
   * - Mobile-first design
   */
  private static generateCSS(layout: MenuStrategy['layout']): string {
    const { colorScheme, typography, type, columns } = layout;

    return `
:root {
  --primary: ${colorScheme.primary};
  --secondary: ${colorScheme.secondary};
  --accent: ${colorScheme.accent};
  --background: ${colorScheme.background};
  --heading-font: '${typography.headingFont}', serif;
  --body-font: '${typography.bodyFont}', sans-serif;
}

/* Base container with mobile-first approach */
.menu-container {
  background: var(--background);
  min-height: 100vh;
  padding: 1rem;
  font-family: var(--body-font);
  color: #fff;
  max-width: 100%;
  overflow-x: hidden;
}

@media (min-width: 768px) {
  .menu-container {
    padding: 2rem;
  }
}

/* Header - minimal, clean */
.menu-header {
  text-align: center;
  padding: 1.5rem 0;
  font-family: var(--heading-font);
}

.menu-header h1 {
  font-size: 2rem;
  color: var(--accent);
  margin-bottom: 0.5rem;
}

.menu-section {
  margin-bottom: 3rem;
}

.section-title {
  font-family: var(--heading-font);
  font-size: 1.75rem;
  color: var(--accent);
  border-bottom: 2px solid var(--secondary);
  padding-bottom: 0.5rem;
  margin-bottom: 1.5rem;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(${columns}, 1fr);
  gap: 1rem;
}

@media (max-width: 768px) {
  .items-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

/* Base menu item - mobile optimized */
.menu-item {
  background: var(--primary);
  border-radius: 12px;
  padding: 1.25rem;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

@media (min-width: 768px) {
  .menu-item {
    padding: 1.5rem;
  }
}

.menu-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}

/* Quadrant-based styling per menu engineering */
.menu-item.quadrant-star {
  border: 2px solid var(--accent);
  background: linear-gradient(135deg, var(--primary), var(--secondary));
}

.menu-item.quadrant-puzzle {
  border-left: 3px solid var(--accent);
}

.menu-item.quadrant-plowhorse {
  /* Standard styling - no special treatment */
}

.menu-item.quadrant-dog {
  opacity: 0.85;
}

.menu-item.highlighted {
  border: 2px solid var(--accent);
  background: linear-gradient(135deg, var(--primary), var(--secondary));
}

.menu-item.anchor {
  background: linear-gradient(135deg, var(--accent), var(--primary));
}

.menu-item.decoy {
  opacity: 0.9;
}

/* Badges - limited to 30% of items for maximum impact */
.item-badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.badge {
  background: var(--accent);
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.item-name {
  font-family: var(--heading-font);
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.item-description {
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.item-price {
  font-size: 1.5rem;
  font-weight: ${typography.priceStyle === 'bold' ? '700' : '400'};
  color: ${typography.priceStyle === 'subtle' ? 'rgba(255,255,255,0.8)' : 'var(--accent)'};
}

.item-price.hidden-dollar::before {
  content: '';
}

/* Layout-specific styles */
${type === 'magazine' ? this.getMagazineStyles() : ''}
${type === 'list' ? this.getListStyles() : ''}
${type === 'minimal' ? this.getMinimalStyles() : ''}
`;
  }

  /**
   * Magazine layout specific styles
   */
  private static getMagazineStyles(): string {
    return `
.menu-item:first-child {
  grid-column: span 2;
}

@media (max-width: 768px) {
  .menu-item:first-child {
    grid-column: span 1;
  }
}
`;
  }

  /**
   * List layout specific styles
   */
  private static getListStyles(): string {
    return `
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.item-content {
  flex: 1;
}

.item-price {
  font-size: 1.25rem;
  white-space: nowrap;
  margin-left: 1rem;
}
`;
  }

  /**
   * Minimal layout specific styles
   */
  private static getMinimalStyles(): string {
    return `
.menu-item {
  background: transparent;
  border-bottom: 1px solid var(--secondary);
  border-radius: 0;
  padding: 1rem 0;
}

.menu-item:hover {
  transform: none;
  box-shadow: none;
}
`;
  }

  /**
   * Generate HTML structure
   */
  private static generateHTML(layout: MenuStrategy['layout'], strategyName: string): string {
    const sectionsHTML = layout.sections
      .map(
        (section) => `
<section class="menu-section" data-section-id="${section.id}">
  <h2 class="section-title">${section.name}</h2>
  <div class="items-grid">
    ${section.items.map((item) => this.generateItemHTML(item, layout.typography.priceStyle)).join('\n')}
  </div>
</section>
`
      )
      .join('\n');

    return `
<div class="menu-container" data-strategy="${strategyName.toLowerCase().replace(/\s+/g, '-')}">
  <header class="menu-header">
    <h1>Our Menu</h1>
    <p>Crafted with care</p>
  </header>
  ${sectionsHTML}
</div>
`;
  }

  /**
   * Generate HTML for a single item
   * Implements menu engineering principles:
   * - Remove currency symbols (hidden-dollar style)
   * - Quadrant-based visual treatment
   * - Clear CTAs
   */
  private static generateItemHTML(
    item: LayoutItem,
    priceStyle: string
  ): string {
    const classes = [
      'menu-item',
      item.isHighlighted ? 'highlighted' : '',
      item.isAnchor ? 'anchor' : '',
      item.isDecoy ? 'decoy' : '',
      item.quadrant ? `quadrant-${item.quadrant}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    // Filter out internal badges like 'collapsed'
    const visibleBadges = item.badges.filter(b => b !== 'collapsed');
    const badgesHTML =
      visibleBadges.length > 0
        ? `<div class="item-badges">${visibleBadges.map((b) => `<span class="badge">${b}</span>`).join('')}</div>`
        : '';

    // Price display follows menu psychology: remove currency symbols to reduce price sensitivity
    const priceDisplay = priceStyle === 'hidden-dollar' 
      ? item.price.toFixed(0) 
      : item.price.toFixed(2);

    return `
<article class="${classes}" data-item-id="${item.id}" data-name="${item.name}" data-price="${item.price}"${item.quadrant ? ` data-quadrant="${item.quadrant}"` : ''}>
  ${badgesHTML}
  <div class="item-content">
    <h3 class="item-name">${item.name}</h3>
    ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
  </div>
  <span class="item-price">${priceDisplay}</span>
</article>
`;
  }

  /**
   * Generate React component code for the layout
   */
  static generateReactComponent(strategy: MenuStrategy): string {
    return `
'use client';

import { useState } from 'react';

// Generated layout for: ${strategy.name}
// Strategy: ${strategy.description}

export default function GeneratedMenu({ sections, onItemClick, onAddToCart }) {
  return (
    <div className="menu-container">
      {sections.map((section) => (
        <section key={section.id} className="menu-section">
          <h2 className="section-title">{section.name}</h2>
          <div className="items-grid">
            {section.items.map((item) => (
              <MenuItemCard 
                key={item.id} 
                item={item} 
                onClick={() => onItemClick?.(item)}
                onAddToCart={() => onAddToCart?.(item)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MenuItemCard({ item, onClick, onAddToCart }) {
  const classes = [
    'menu-item',
    item.isHighlighted && 'highlighted',
    item.isAnchor && 'anchor',
    item.isDecoy && 'decoy',
  ].filter(Boolean).join(' ');

  return (
    <article className={classes} onClick={onClick}>
      {item.badges?.length > 0 && (
        <div className="item-badges">
          {item.badges.map((badge, i) => (
            <span key={i} className="badge">{badge}</span>
          ))}
        </div>
      )}
      <h3 className="item-name">{item.name}</h3>
      {item.description && <p className="item-description">{item.description}</p>}
      <div className="item-footer">
        <span className="item-price">\${item.price.toFixed(2)}</span>
        <button onClick={(e) => { e.stopPropagation(); onAddToCart(); }}>
          Add to Cart
        </button>
      </div>
    </article>
  );
}
`;
  }
}
