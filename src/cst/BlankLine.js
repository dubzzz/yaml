import Node, { Type } from './Node'
import Range from './Range'

export default class BlankLine extends Node {
  constructor() {
    super(Type.BLANK_LINE)
  }

  /**
   * Parses blank lines from the source
   *
   * @param {ParseContext} context
   * @param {number} start - Index of first \n character
   * @returns {number} - Index of the character after this
   */
  parse(context, start) {
    this.context = context
    const { src } = context
    let offset = start + 1
    while (Node.atBlank(src, offset)) {
      const lineEnd = Node.endOfWhiteSpace(src, offset)
      if (lineEnd === '\n') offset = lineEnd + 1
      else break
    }
    this.range = new Range(start, offset)
    return offset
  }
}
