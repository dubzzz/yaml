"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.nullOptions = exports.stringifyNumber = void 0;

var _failsafe = _interopRequireDefault(require("./failsafe"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var stringifyNumber = function stringifyNumber(value) {
  return isFinite(value) ? JSON.stringify(value) : isNaN(value) ? '.nan' : value < 0 ? '-.inf' : '.inf';
};

exports.stringifyNumber = stringifyNumber;
var nullOptions = {
  nullStr: 'null'
};
exports.nullOptions = nullOptions;

var _default = _failsafe.default.concat([{
  class: null,
  tag: 'tag:yaml.org,2002:null',
  test: /^(?:~|null)?$/i,
  resolve: function resolve() {
    return null;
  },
  options: nullOptions,
  stringify: function stringify(value) {
    return nullOptions.nullStr;
  }
}, {
  class: Boolean,
  tag: 'tag:yaml.org,2002:bool',
  test: /^(?:true|false)$/i,
  resolve: function resolve(str) {
    return str[0] === 't' || str[0] === 'T';
  }
}, {
  class: Number,
  tag: 'tag:yaml.org,2002:int',
  format: 'oct',
  test: /^0o([0-7]+)$/,
  resolve: function resolve(str, oct) {
    return parseInt(oct, 8);
  },
  stringify: function stringify(value) {
    return '0o' + value.toString(8);
  }
}, {
  class: Number,
  tag: 'tag:yaml.org,2002:int',
  test: /^[-+]?[0-9]+$/,
  resolve: function resolve(str) {
    return parseInt(str, 10);
  },
  stringify: stringifyNumber
}, {
  class: Number,
  tag: 'tag:yaml.org,2002:int',
  format: 'hex',
  test: /^0x([0-9a-fA-F]+)$/,
  resolve: function resolve(str, hex) {
    return parseInt(hex, 16);
  },
  stringify: function stringify(value) {
    return '0x' + value.toString(16);
  }
}, {
  class: Number,
  tag: 'tag:yaml.org,2002:float',
  test: /^(?:[-+]?\.inf|(\.nan))$/i,
  resolve: function resolve(str, nan) {
    return nan ? NaN : str[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  },
  stringify: stringifyNumber
}, {
  class: Number,
  tag: 'tag:yaml.org,2002:float',
  test: /^[-+]?(0|[1-9][0-9]*)(\.[0-9]*)?([eE][-+]?[0-9]+)?$/,
  resolve: function resolve(str) {
    return parseFloat(str);
  },
  stringify: stringifyNumber
}]);

exports.default = _default;