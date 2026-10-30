import { describe, expect, it } from 'vitest'
import { projectTemplates, templateCategories } from '../src/templates/templateCatalog'
import { validateTemplateCatalog } from '../src/templates/templateUtils'

describe('standard template catalog', () => {
  it('contains 36 valid, uniquely identified templates', () => {
    expect(projectTemplates).toHaveLength(36)
    expect(validateTemplateCatalog(projectTemplates, templateCategories)).toEqual([])
    expect(new Set(projectTemplates.map(({ id }) => id)).size).toBe(36)
  })

  it('uses stable ordering instead of runtime creation timestamps', () => {
    const orders = projectTemplates.map(({ sortOrder }) => sortOrder)
    expect(new Set(orders).size).toBe(projectTemplates.length)
    expect(projectTemplates.every(({ createdAt }) => createdAt === undefined)).toBe(true)
  })
})
