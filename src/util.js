'use strict';

module.exports = {
  encode: encode,
  merge: merge,
  queryRegExp: queryRegExp,
};

function merge(obj1, obj2) {
  var result = {};
  var attr;

  for (attr in obj1) {
    result[attr] = obj1[attr];
  }

  for (attr in obj2) {
    result[attr] = obj2[attr];
  }

  return result;
}

function queryRegExp(query) {
  return new RegExp('(.*?)(' + escapeRegExp(query) + ')', 'ig');
}

function escapeRegExp(str) {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function encode(str) {
  return str
   .replace(/&/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')
   .replace(/'/g, '&#039;');
}
