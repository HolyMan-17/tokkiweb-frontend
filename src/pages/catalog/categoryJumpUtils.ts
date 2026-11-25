import { slugify } from '../../constants';

export function getCategorySectionId(categoryName: string): string {
  return `category-section-${slugify(categoryName)}`;
}
