import YAML from '../src/index'
import * as fc from 'fast-check'

describe('properties', () => {
  test('parse stringified object', () => {
    const yamlKey = fc.fullUnicodeString()
    const yamlValues = [
      yamlKey,
      fc.lorem(1000, false), // words
      fc.lorem(100, true), // sentences
      fc.boolean(),
      fc.integer(),
      fc.double(),
      fc.constantFrom(null, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)
    ]
    const yamlArbitrary = fc.anything({ key: yamlKey, values: yamlValues })
    const yamlOptions = fc.record(
      {
        keepBlobsInJSON: fc.boolean(),
        keepCstNodes: fc.boolean(),
        keepNodeTypes: fc.boolean(),
        mapAsMap: fc.constant(false),
        merge: fc.boolean(),
        schema: fc.constantFrom('core', 'yaml-1.1') // ignore 'failsafe', 'json'
      },
      { withDeletedKeys: true }
    )

    fc.assert(
      fc.property(yamlArbitrary, yamlOptions, (obj, opts) => {
        expect(YAML.parse(YAML.stringify(obj, opts), opts)).toStrictEqual(obj)
      })
    )
  })
})
