import { Type } from '../cst/Node'
import createNode from '../createNode'
import { YAMLReferenceError, YAMLWarning } from '../errors'
import Alias from './Alias'
import Collection from './Collection'
import core from './core'
import failsafe from './failsafe'
import json from './json'
import Node from './Node'
import Pair from './Pair'
import Scalar from './Scalar'
import { resolve as resolveStr } from './_string'
import yaml11 from './yaml-1.1'

const isMap = ({ type }) => type === Type.FLOW_MAP || type === Type.MAP

const isSeq = ({ type }) => type === Type.FLOW_SEQ || type === Type.SEQ

export default class Schema {
  static defaultPrefix = 'tag:yaml.org,2002:'

  static defaultTags = {
    MAP: 'tag:yaml.org,2002:map',
    SEQ: 'tag:yaml.org,2002:seq',
    STR: 'tag:yaml.org,2002:str'
  }

  static tags = {
    core,
    failsafe,
    json,
    'yaml-1.1': yaml11
  }

  static defaultStringify(value) {
    return JSON.stringify(value)
  }

  constructor({ merge, schema, tags }) {
    this.merge = !!merge
    this.name = schema
    this.tags = Schema.tags[schema]
    if (!this.tags) {
      const keys = Object.keys(Schema.tags).map(key => JSON.stringify(key))
      throw new Error(`Unknown schema; use one of ${keys.join(', ')}`)
    }
    if (Array.isArray(tags)) {
      this.tags = this.tags.concat(tags)
    } else if (typeof tags === 'function') {
      this.tags = tags(this.tags.slice())
    }
  }

  // falls back to string on no match
  resolveScalar(str, tags) {
    if (!tags) tags = this.tags
    for (let i = 0; i < tags.length; ++i) {
      const { format, test, resolve } = tags[i]
      if (test) {
        const match = str.match(test)
        if (match) {
          const res = new Scalar(resolve.apply(null, match))
          if (format) res.format = format
          return res
        }
      }
    }
    if (this.tags.scalarFallback) str = this.tags.scalarFallback(str)
    return new Scalar(str)
  }

  // sets node.resolved on success
  resolveNode(doc, node, tagName) {
    const tags = this.tags.filter(({ tag }) => tag === tagName)
    const generic = tags.find(({ test }) => !test)
    if (node.error) doc.errors.push(node.error)
    try {
      if (generic) {
        let res = generic.resolve(doc, node)
        if (!(res instanceof Collection)) res = new Scalar(res)
        node.resolved = res
      } else {
        const str = resolveStr(doc, node)
        if (typeof str === 'string' && tags.length > 0) {
          node.resolved = this.resolveScalar(str, tags)
        }
      }
    } catch (error) {
      if (!error.source) error.source = node
      doc.errors.push(error)
      node.resolved = null
    }
    if (!node.resolved) return null
    if (tagName) node.resolved.tag = tagName
    return node.resolved
  }

  resolveNodeWithFallback(doc, node, tagName) {
    const res = this.resolveNode(doc, node, tagName)
    if (node.hasOwnProperty('resolved')) return res
    const fallback = isMap(node)
      ? Schema.defaultTags.MAP
      : isSeq(node)
      ? Schema.defaultTags.SEQ
      : Schema.defaultTags.STR
    if (fallback) {
      doc.warnings.push(
        new YAMLWarning(
          node,
          `The tag ${tagName} is unavailable, falling back to ${fallback}`
        )
      )
      const res = this.resolveNode(doc, node, fallback)
      res.tag = tagName
      return res
    } else {
      doc.errors.push(
        new YAMLReferenceError(node, `The tag ${tagName} is unavailable`)
      )
    }
    return null
  }

  getTagObject(item) {
    if (item instanceof Alias) return Alias
    if (item.tag) {
      let match = this.tags.find(
        ({ format, tag }) => tag === item.tag && format === item.format
      )
      if (!match) match = this.tags.find(({ tag }) => tag === item.tag)
      if (match) return match
    }
    if (item.value === null) {
      const match = this.tags.find(t => t.class === null && !t.format)
      if (!match) throw new Error('Tag not resolved for null value')
      return match
    } else {
      let obj = item
      if (item.hasOwnProperty('value')) {
        switch (typeof item.value) {
          case 'boolean':
            obj = new Boolean()
            break
          case 'number':
            obj = new Number()
            break
          case 'string':
            obj = new String()
            break
          default:
            obj = item.value
        }
      }
      let match = this.tags.find(
        t => t.class && obj instanceof t.class && t.format === item.format
      )
      if (!match) {
        match = this.tags.find(
          t => t.class && obj instanceof t.class && !t.format
        )
      }
      if (!match) {
        const name = obj && obj.constructor ? obj.constructor.name : typeof obj
        throw new Error(`Tag not resolved for ${name} value`)
      }
      return match
    }
  }

  // needs to be called before stringifier to allow for circular anchor refs
  stringifyProps(node, tagObj, { anchors, doc }) {
    const props = []
    const anchor = doc.anchors.getName(node)
    if (anchor) {
      anchors[anchor] = node
      props.push(`&${anchor}`)
    }
    if (node.tag && node.tag !== tagObj.tag) {
      props.push(doc.stringifyTag(node.tag))
    } else if (!tagObj.default) {
      props.push(doc.stringifyTag(tagObj.tag))
    }
    return props.join(' ')
  }

  stringify(item, ctx, onComment) {
    if (!(item instanceof Node)) item = createNode(item, true)
    ctx.tags = this
    if (item instanceof Pair) return item.toString(ctx, onComment)
    const tagObj = this.getTagObject(item)
    const props = this.stringifyProps(item, tagObj, ctx)
    const stringify = tagObj.stringify || Schema.defaultStringify
    const str = stringify(item, ctx, onComment)
    return props
      ? item instanceof Collection && str[0] !== '{' && str[0] !== '['
        ? `${props}\n${ctx.indent}${str}`
        : `${props} ${str}`
      : str
  }
}
