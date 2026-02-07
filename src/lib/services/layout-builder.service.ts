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
 * Layout Builder Agent
 * Takes a selected strategy and builds a deployable menu layout
 */
export class LayoutBuilderAgent {
  /**
   * Build a complete layout from a strategy
   */
  static async buildLayout(strategy: MenuStrategy, experimentId?: string): Promise<BuiltLayout> {
    const { layout } = strategy;

    // Generate CSS based on strategy
    const css = this.generateCSS(layout);

    // Generate HTML structure
    const html = this.generateHTML(layout, strategy.name);

    return {
      id: `layout-${Date.now()}`,
      strategyId: strategy.id,
      strategyName: strategy.name,
      html,
      css,
      sections: layout.sections,
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1,
        experimentId,
      },
    };
  }

  /**
   * Generate CSS for the layout
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

.menu-container {
  background: var(--background);
  min-height: 100vh;
  padding: 2rem;
  font-family: var(--body-font);
  color: #fff;
}

.menu-header {
  text-align: center;
  padding: 2rem 0;
  font-family: var(--heading-font);
}

.menu-header h1 {
  font-size: 2.5rem;
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
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .items-grid {
    grid-template-columns: 1fr;
  }
}

.menu-item {
  background: var(--primary);
  border-radius: 12px;
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.menu-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
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
    ]
      .filter(Boolean)
      .join(' ');

    const badgesHTML =
      item.badges.length > 0
        ? `<div class="item-badges">${item.badges.map((b) => `<span class="badge">${b}</span>`).join('')}</div>`
        : '';

    const priceDisplay =
      priceStyle === 'hidden-dollar' ? item.price.toFixed(0) : `$${item.price.toFixed(2)}`;

    return `
<article class="${classes}" data-item-id="${item.id}" data-name="${item.name}" data-price="${item.price}">
  ${badgesHTML}
  <div class="item-content">
    <h3 class="item-name">${item.name}</h3>
    ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
  </div>
  <span class="item-price ${priceStyle === 'hidden-dollar' ? 'hidden-dollar' : ''}">${priceDisplay}</span>
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
