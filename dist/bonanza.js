(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

module.exports = require('./src');

},{"./src":7}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

/*global define: false Mustache: true*/

(function defineMustache (global, factory) {
  if (typeof exports === 'object' && exports && typeof exports.nodeName !== 'string') {
    factory(exports); // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], factory); // AMD
  } else {
    global.Mustache = {};
    factory(Mustache); // script, wsh, asp
  }
}(this, function mustacheFactory (mustache) {

  var objectToString = Object.prototype.toString;
  var isArray = Array.isArray || function isArrayPolyfill (object) {
    return objectToString.call(object) === '[object Array]';
  };

  function isFunction (object) {
    return typeof object === 'function';
  }

  /**
   * More correct typeof string handling array
   * which normally returns typeof 'object'
   */
  function typeStr (obj) {
    return isArray(obj) ? 'array' : typeof obj;
  }

  function escapeRegExp (string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
  }

  /**
   * Null safe way of checking whether or not an object,
   * including its prototype, has a given property
   */
  function hasProperty (obj, propName) {
    return obj != null && typeof obj === 'object' && (propName in obj);
  }

  // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
  // See https://github.com/janl/mustache.js/issues/189
  var regExpTest = RegExp.prototype.test;
  function testRegExp (re, string) {
    return regExpTest.call(re, string);
  }

  var nonSpaceRe = /\S/;
  function isWhitespace (string) {
    return !testRegExp(nonSpaceRe, string);
  }

  var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };

  function escapeHtml (string) {
    return String(string).replace(/[&<>"'\/]/g, function fromEntityMap (s) {
      return entityMap[s];
    });
  }

  var whiteRe = /\s*/;
  var spaceRe = /\s+/;
  var equalsRe = /\s*=/;
  var curlyRe = /\s*\}/;
  var tagRe = /#|\^|\/|>|\{|&|=|!/;

  /**
   * Breaks up the given `template` string into a tree of tokens. If the `tags`
   * argument is given here it must be an array with two string values: the
   * opening and closing tags used in the template (e.g. [ "<%", "%>" ]). Of
   * course, the default is to use mustaches (i.e. mustache.tags).
   *
   * A token is an array with at least 4 elements. The first element is the
   * mustache symbol that was used inside the tag, e.g. "#" or "&". If the tag
   * did not contain a symbol (i.e. {{myValue}}) this element is "name". For
   * all text that appears outside a symbol this element is "text".
   *
   * The second element of a token is its "value". For mustache tags this is
   * whatever else was inside the tag besides the opening symbol. For text tokens
   * this is the text itself.
   *
   * The third and fourth elements of the token are the start and end indices,
   * respectively, of the token in the original template.
   *
   * Tokens that are the root node of a subtree contain two more elements: 1) an
   * array of tokens in the subtree and 2) the index in the original template at
   * which the closing tag for that section begins.
   */
  function parseTemplate (template, tags) {
    if (!template)
      return [];

    var sections = [];     // Stack to hold section tokens
    var tokens = [];       // Buffer to hold the tokens
    var spaces = [];       // Indices of whitespace tokens on the current line
    var hasTag = false;    // Is there a {{tag}} on the current line?
    var nonSpace = false;  // Is there a non-space char on the current line?

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    function stripSpace () {
      if (hasTag && !nonSpace) {
        while (spaces.length)
          delete tokens[spaces.pop()];
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    }

    var openingTagRe, closingTagRe, closingCurlyRe;
    function compileTags (tagsToCompile) {
      if (typeof tagsToCompile === 'string')
        tagsToCompile = tagsToCompile.split(spaceRe, 2);

      if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
        throw new Error('Invalid tags: ' + tagsToCompile);

      openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + '\\s*');
      closingTagRe = new RegExp('\\s*' + escapeRegExp(tagsToCompile[1]));
      closingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + tagsToCompile[1]));
    }

    compileTags(tags || mustache.tags);

    var scanner = new Scanner(template);

    var start, type, value, chr, token, openSection;
    while (!scanner.eos()) {
      start = scanner.pos;

      // Match any text between tags.
      value = scanner.scanUntil(openingTagRe);

      if (value) {
        for (var i = 0, valueLength = value.length; i < valueLength; ++i) {
          chr = value.charAt(i);

          if (isWhitespace(chr)) {
            spaces.push(tokens.length);
          } else {
            nonSpace = true;
          }

          tokens.push([ 'text', chr, start, start + 1 ]);
          start += 1;

          // Check for whitespace on the current line.
          if (chr === '\n')
            stripSpace();
        }
      }

      // Match the opening tag.
      if (!scanner.scan(openingTagRe))
        break;

      hasTag = true;

      // Get the tag type.
      type = scanner.scan(tagRe) || 'name';
      scanner.scan(whiteRe);

      // Get the tag value.
      if (type === '=') {
        value = scanner.scanUntil(equalsRe);
        scanner.scan(equalsRe);
        scanner.scanUntil(closingTagRe);
      } else if (type === '{') {
        value = scanner.scanUntil(closingCurlyRe);
        scanner.scan(curlyRe);
        scanner.scanUntil(closingTagRe);
        type = '&';
      } else {
        value = scanner.scanUntil(closingTagRe);
      }

      // Match the closing tag.
      if (!scanner.scan(closingTagRe))
        throw new Error('Unclosed tag at ' + scanner.pos);

      token = [ type, value, start, scanner.pos ];
      tokens.push(token);

      if (type === '#' || type === '^') {
        sections.push(token);
      } else if (type === '/') {
        // Check section nesting.
        openSection = sections.pop();

        if (!openSection)
          throw new Error('Unopened section "' + value + '" at ' + start);

        if (openSection[1] !== value)
          throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
      } else if (type === 'name' || type === '{' || type === '&') {
        nonSpace = true;
      } else if (type === '=') {
        // Set the tags for the next time around.
        compileTags(value);
      }
    }

    // Make sure there are no open sections when we're done.
    openSection = sections.pop();

    if (openSection)
      throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);

    return nestTokens(squashTokens(tokens));
  }

  /**
   * Combines the values of consecutive text tokens in the given `tokens` array
   * to a single token.
   */
  function squashTokens (tokens) {
    var squashedTokens = [];

    var token, lastToken;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      token = tokens[i];

      if (token) {
        if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
          lastToken[1] += token[1];
          lastToken[3] = token[3];
        } else {
          squashedTokens.push(token);
          lastToken = token;
        }
      }
    }

    return squashedTokens;
  }

  /**
   * Forms the given array of `tokens` into a nested tree structure where
   * tokens that represent a section have two additional items: 1) an array of
   * all tokens that appear in that section and 2) the index in the original
   * template that represents the end of that section.
   */
  function nestTokens (tokens) {
    var nestedTokens = [];
    var collector = nestedTokens;
    var sections = [];

    var token, section;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      token = tokens[i];

      switch (token[0]) {
      case '#':
      case '^':
        collector.push(token);
        sections.push(token);
        collector = token[4] = [];
        break;
      case '/':
        section = sections.pop();
        section[5] = token[2];
        collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
        break;
      default:
        collector.push(token);
      }
    }

    return nestedTokens;
  }

  /**
   * A simple string scanner that is used by the template parser to find
   * tokens in template strings.
   */
  function Scanner (string) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
  }

  /**
   * Returns `true` if the tail is empty (end of string).
   */
  Scanner.prototype.eos = function eos () {
    return this.tail === '';
  };

  /**
   * Tries to match the given regular expression at the current position.
   * Returns the matched text if it can match, the empty string otherwise.
   */
  Scanner.prototype.scan = function scan (re) {
    var match = this.tail.match(re);

    if (!match || match.index !== 0)
      return '';

    var string = match[0];

    this.tail = this.tail.substring(string.length);
    this.pos += string.length;

    return string;
  };

  /**
   * Skips all text until the given regular expression can be matched. Returns
   * the skipped string, which is the entire tail if no match can be made.
   */
  Scanner.prototype.scanUntil = function scanUntil (re) {
    var index = this.tail.search(re), match;

    switch (index) {
    case -1:
      match = this.tail;
      this.tail = '';
      break;
    case 0:
      match = '';
      break;
    default:
      match = this.tail.substring(0, index);
      this.tail = this.tail.substring(index);
    }

    this.pos += match.length;

    return match;
  };

  /**
   * Represents a rendering context by wrapping a view object and
   * maintaining a reference to the parent context.
   */
  function Context (view, parentContext) {
    this.view = view;
    this.cache = { '.': this.view };
    this.parent = parentContext;
  }

  /**
   * Creates a new context using the given view with this context
   * as the parent.
   */
  Context.prototype.push = function push (view) {
    return new Context(view, this);
  };

  /**
   * Returns the value of the given name in this context, traversing
   * up the context hierarchy if the value is absent in this context's view.
   */
  Context.prototype.lookup = function lookup (name) {
    var cache = this.cache;

    var value;
    if (cache.hasOwnProperty(name)) {
      value = cache[name];
    } else {
      var context = this, names, index, lookupHit = false;

      while (context) {
        if (name.indexOf('.') > 0) {
          value = context.view;
          names = name.split('.');
          index = 0;

          /**
           * Using the dot notion path in `name`, we descend through the
           * nested objects.
           *
           * To be certain that the lookup has been successful, we have to
           * check if the last object in the path actually has the property
           * we are looking for. We store the result in `lookupHit`.
           *
           * This is specially necessary for when the value has been set to
           * `undefined` and we want to avoid looking up parent contexts.
           **/
          while (value != null && index < names.length) {
            if (index === names.length - 1)
              lookupHit = hasProperty(value, names[index]);

            value = value[names[index++]];
          }
        } else {
          value = context.view[name];
          lookupHit = hasProperty(context.view, name);
        }

        if (lookupHit)
          break;

        context = context.parent;
      }

      cache[name] = value;
    }

    if (isFunction(value))
      value = value.call(this.view);

    return value;
  };

  /**
   * A Writer knows how to take a stream of tokens and render them to a
   * string, given a context. It also maintains a cache of templates to
   * avoid the need to parse the same template twice.
   */
  function Writer () {
    this.cache = {};
  }

  /**
   * Clears all cached templates in this writer.
   */
  Writer.prototype.clearCache = function clearCache () {
    this.cache = {};
  };

  /**
   * Parses and caches the given `template` and returns the array of tokens
   * that is generated from the parse.
   */
  Writer.prototype.parse = function parse (template, tags) {
    var cache = this.cache;
    var tokens = cache[template];

    if (tokens == null)
      tokens = cache[template] = parseTemplate(template, tags);

    return tokens;
  };

  /**
   * High-level method that is used to render the given `template` with
   * the given `view`.
   *
   * The optional `partials` argument may be an object that contains the
   * names and templates of partials that are used in the template. It may
   * also be a function that is used to load partial templates on the fly
   * that takes a single argument: the name of the partial.
   */
  Writer.prototype.render = function render (template, view, partials) {
    var tokens = this.parse(template);
    var context = (view instanceof Context) ? view : new Context(view);
    return this.renderTokens(tokens, context, partials, template);
  };

  /**
   * Low-level method that renders the given array of `tokens` using
   * the given `context` and `partials`.
   *
   * Note: The `originalTemplate` is only ever used to extract the portion
   * of the original template that was contained in a higher-order section.
   * If the template doesn't use higher-order sections, this argument may
   * be omitted.
   */
  Writer.prototype.renderTokens = function renderTokens (tokens, context, partials, originalTemplate) {
    var buffer = '';

    var token, symbol, value;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      value = undefined;
      token = tokens[i];
      symbol = token[0];

      if (symbol === '#') value = this.renderSection(token, context, partials, originalTemplate);
      else if (symbol === '^') value = this.renderInverted(token, context, partials, originalTemplate);
      else if (symbol === '>') value = this.renderPartial(token, context, partials, originalTemplate);
      else if (symbol === '&') value = this.unescapedValue(token, context);
      else if (symbol === 'name') value = this.escapedValue(token, context);
      else if (symbol === 'text') value = this.rawValue(token);

      if (value !== undefined)
        buffer += value;
    }

    return buffer;
  };

  Writer.prototype.renderSection = function renderSection (token, context, partials, originalTemplate) {
    var self = this;
    var buffer = '';
    var value = context.lookup(token[1]);

    // This function is used to render an arbitrary template
    // in the current context by higher-order sections.
    function subRender (template) {
      return self.render(template, context, partials);
    }

    if (!value) return;

    if (isArray(value)) {
      for (var j = 0, valueLength = value.length; j < valueLength; ++j) {
        buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate);
      }
    } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
      buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate);
    } else if (isFunction(value)) {
      if (typeof originalTemplate !== 'string')
        throw new Error('Cannot use higher-order sections without the original template');

      // Extract the portion of the original template that the section contains.
      value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);

      if (value != null)
        buffer += value;
    } else {
      buffer += this.renderTokens(token[4], context, partials, originalTemplate);
    }
    return buffer;
  };

  Writer.prototype.renderInverted = function renderInverted (token, context, partials, originalTemplate) {
    var value = context.lookup(token[1]);

    // Use JavaScript's definition of falsy. Include empty arrays.
    // See https://github.com/janl/mustache.js/issues/186
    if (!value || (isArray(value) && value.length === 0))
      return this.renderTokens(token[4], context, partials, originalTemplate);
  };

  Writer.prototype.renderPartial = function renderPartial (token, context, partials) {
    if (!partials) return;

    var value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
    if (value != null)
      return this.renderTokens(this.parse(value), context, partials, value);
  };

  Writer.prototype.unescapedValue = function unescapedValue (token, context) {
    var value = context.lookup(token[1]);
    if (value != null)
      return value;
  };

  Writer.prototype.escapedValue = function escapedValue (token, context) {
    var value = context.lookup(token[1]);
    if (value != null)
      return mustache.escape(value);
  };

  Writer.prototype.rawValue = function rawValue (token) {
    return token[1];
  };

  mustache.name = 'mustache.js';
  mustache.version = '2.1.3';
  mustache.tags = [ '{{', '}}' ];

  // All high-level mustache.* functions use this writer.
  var defaultWriter = new Writer();

  /**
   * Clears all cached templates in the default writer.
   */
  mustache.clearCache = function clearCache () {
    return defaultWriter.clearCache();
  };

  /**
   * Parses and caches the given template in the default writer and returns the
   * array of tokens it contains. Doing this ahead of time avoids the need to
   * parse templates on the fly as they are rendered.
   */
  mustache.parse = function parse (template, tags) {
    return defaultWriter.parse(template, tags);
  };

  /**
   * Renders the `template` with the given `view` and `partials` using the
   * default writer.
   */
  mustache.render = function render (template, view, partials) {
    if (typeof template !== 'string') {
      throw new TypeError('Invalid template! Template should be a "string" ' +
                          'but "' + typeStr(template) + '" was given as the first ' +
                          'argument for mustache#render(template, view, partials)');
    }

    return defaultWriter.render(template, view, partials);
  };

  // This is here for backwards compatibility with 0.4.x.,
  /*eslint-disable */ // eslint wants camel cased function name
  mustache.to_html = function to_html (template, view, partials, send) {
    /*eslint-enable*/

    var result = mustache.render(template, view, partials);

    if (isFunction(send)) {
      send(result);
    } else {
      return result;
    }
  };

  // Export the escaping function so that the user may override it.
  // See https://github.com/janl/mustache.js/issues/244
  mustache.escape = escapeHtml;

  // Export these mainly for testing, but also for advanced usage.
  mustache.Scanner = Scanner;
  mustache.Context = Context;
  mustache.Writer = Writer;

}));

},{}],5:[function(require,module,exports){
'use strict';

var css = {
  container: 'bz-container',
  hide: 'bz-hide',
  list: 'bz-list',
  item: 'bz-list-item',
  selected: 'bz-list-item-selected',
  loading: 'bz-list-loading',
  loadMore: 'bz-list-load-more',
  noResults: 'bz-list-no-results',
  inputLoading: 'bz-loading',
  match: 'bz-text-match'
};

var templates = {
  item: '{{.}}',
  label: '{{.}}',
  noResults: 'No results for "{{search}}"',
  loadMore: '...',
  loading: 'Loading ...'
};

module.exports = {
  templates: templates,
  css: css,
  openOnFocus: true,
  showLoading: true,
  showloadMore: true,
  limit: 10,
  scrollDistance: 0,
  hasMoreItems: function (result) { return !!result.length && result.length === this.limit; },
  getItems: function (result) { return result; },
  closeOnBlur: true
};

},{}],6:[function(require,module,exports){
'use strict';

module.exports = {
  addClass: addClass,
  removeClass: removeClass,
  hasClass: hasClass
};

function addClass(element, className) {
  if (!className) {
    return;
  }

  if (!hasClass(element, className)) {
    element.className = (element.className + (element.className ? ' ' : '') + className);
  }
}

function removeClass(element, className) {
  if (!className) {
    return;
  }

  var classRegex = new RegExp('\\b' + className + '\\b', 'g');
  element.className = element.className.replace(classRegex, '').replace(/  /g, ' ').trim();
}

function hasClass(element, className) {
  var classes = element.className.split(' ');

  return classes.indexOf(className) !== -1;
}

},{}],7:[function(require,module,exports){
(function (process,global){
'use strict';

var EventEmitter = require('events').EventEmitter;
var dom = require('./dom.js');
var defaults = require('./defaults.js');
var keys = require('./keys.js');
var list = require('./list.js');
var render = require('./render.js');
var util = require('./util.js');

bonanza.defaults = defaults;
bonanza.render = render;
global.bonanza = bonanza;
module.exports = bonanza;

function bonanza(element, options, callback) {
  if (!element) {
    throw new Error('An element is required to initialize bonanza');
  }

  if (!callback) {
    callback = options;
    options = {};
  }

  if (!callback) {
    throw new Error('A source is required to initialize bonanza');
  }

  if (Array.isArray(callback)) {
    callback = buildCallbackFromArray(callback);
  }

  if (options.templates) {
    if (options.templates.item && options.templates.label === undefined) {
      options.templates.label = options.templates.item;
    }

    options.templates = util.merge(defaults.templates, options.templates);
  }

  if (options.css) {
    options.css = util.merge(defaults.css, options.css);
  }

  options = util.merge(defaults, options);

  var context = new EventEmitter();
  var selectedItem, lastQuery, initialState;

  var container = document.createElement('div');
  container.className = options.css.container || '';
  element.parentNode.appendChild(container);
  dom.addClass(container, options.css.hide);

  context.container = container;
  context.input = element;
  context.options = options;

  var dataList = list.create(context, options);

  container.addEventListener('scroll', function (e) {
    var bottom = e.target.scrollTop + e.target.clientHeight - e.target.scrollHeight;

    if (bottom >= (-1 * options.scrollDistance) && dataList.hasMoreItems() && initialState) {
      context.emit('search', { offset: dataList.items.length, limit: options.limit, search: initialState.searchTerm });
    }
  });

  container.onmousewheel = handleMouseWheel;

  element.addEventListener('focus', function () {
    context.emit('focus');
  });

  element.addEventListener('blur', function (e) {
    if (options.closeOnBlur) {
      context.emit('close');
    }
  });

  element.addEventListener('keyup', function (e) {
    if (!(e.keyCode.toString() in keys)) {
      showList();
      context.emit('search', { offset: 0, limit: options.limit, search: element.value });
    }
  });

  element.addEventListener('keydown', function (e) {
    var lastIndex, nodeIndex;
    var key = keys[e.keyCode];

    if (selectedItem) {
      lastIndex = dataList.items.indexOf(selectedItem);
    }
    else {
      lastIndex = 0;
    }

    if (key === 'up') {
      nodeIndex = (lastIndex || 0) - 1;

      if (nodeIndex === -1 && dataList.hasMoreItems()) {
        nodeIndex = 0;
      }
      else if (nodeIndex < 0) {
        nodeIndex = dataList.items.length - 1;
      }

      showList();
      context.emit('select', dataList.items[nodeIndex].data);
    }

    else if (key === 'down') {
      if (selectedItem) {
        nodeIndex = lastIndex + 1;
      }
      else {
        nodeIndex = 0;
      }

      if (!dataList.hasMoreItems() && nodeIndex > dataList.items.length - 1) {
        nodeIndex = 0;
      }

      if (!dataList.items.length || (dataList.hasMoreItems() && nodeIndex >= dataList.items.length - 2)) {
        showList();
        context.emit('search', { offset: dataList.items.length, limit: options.limit, search: initialState ? initialState.searchTerm : element.value });
      }

      if (dataList.items[nodeIndex]) {
        context.emit('select', dataList.items[nodeIndex].data);
      }
    }

    else if (key === 'enter' && isVisible()) {
      selectedItem = selectedItem || dataList.items[0];

      if (selectedItem) {
        context.emit('change', selectedItem.data);
      }
    }

    else if (key === 'escape' && isVisible()) {
      context.emit('cancel');
    }
  });

  context.on('focus', function () {
    if (options.openOnFocus) {
      process.nextTick(element.setSelectionRange.bind(element, 0, element.value.length));
      context.emit('search', { offset: 0, limit: options.limit, search: element.value });
    }
  });

  context.on('open', function () {
    dom.removeClass(container, options.css.hide);
    container.style.top = (element.offsetTop + element.offsetHeight) + 'px';
    container.style.left = (element.offsetLeft) + 'px';
  });

  context.on('close', function () {
    dataList.clean();
    dom.addClass(container, options.css.hide);
    selectedItem = null;
    lastQuery = null;
  });

  context.on('change', function (item) {
    if (item) {
      element.value = render(options.templates.label, item, false);
    }

    initialState = null;
    context.emit('close');
  });

  context.on('select', function (data) {
    if (selectedItem) {
      dom.removeClass(selectedItem.element, options.css.selected);
    }

    selectedItem = dataList.getByData(data);

    if (selectedItem) {
      element.value = render(options.templates.label, data, false);
      dom.addClass(selectedItem.element, options.css.selected);
      var top = selectedItem.element.offsetTop;
      var bottom = selectedItem.element.offsetTop + selectedItem.element.offsetHeight;

      if (bottom > container.clientHeight + container.scrollTop) {
        container.scrollTop = selectedItem.element.offsetTop - container.clientHeight + selectedItem.element.offsetHeight;
      }
      else if (top < container.scrollTop) {
        container.scrollTop = selectedItem.element.offsetTop;
      }
    }
  });

  context.on('cancel', function () {
    if (initialState) {
      element.value = initialState.searchTerm;
      initialState = null;
    }

    context.emit('close');
  });

  context.on('search', function (query) {
    if (lastQuery && lastQuery.search === query.search && lastQuery.offset === query.offset) {
      return;
    }

    if (query.offset === 0) {
      initialState = { oldValue: element.value, searchTerm: query.search };
    }

    if (options.showLoading) {
      dataList.showLoading(query);
      dom.addClass(element, options.css.inputLoading);
    }

    showList();

    lastQuery = query;
    callback(query, function (err, result) {
      dataList.hideLoading();
      dom.removeClass(element, options.css.inputLoading);

      if (err) {
        context.emit('error', err);
        return;
      }

      if (lastQuery === query) {
        context.emit('success', result, query);
      }
    });
  });

  context.on('success', function (result, query) {
    var items = options.getItems(result);

    if (query.offset === 0) {
      dataList.clean();
    }

    if (items) {
      showList();

      items.forEach(function (item) {
        dataList.push(item, query.search);
      });

      if (options.hasMoreItems(result)) {
        dataList.showLoadMore(result);
      }
      else if (!dataList.items.length) {
        dataList.showNoResults(query);
      }
    }
  });

  return context;

  function isVisible() {
    return !dom.hasClass(container, options.css.hide);
  }

  function showList() {
    if (!isVisible()) {
      context.emit('open');
    }
  }

  function buildCallbackFromArray(array) {
    return function (query, done) {
      var result = array
        .filter(function (item) {
          var desc = render(options.templates.label, item, false);

          return util.queryRegExp(query.search).test(desc);
        })
        .slice(query.offset, query.offset + query.limit);

      done(null, result);
    };
  }

  function handleMouseWheel(e) {
    var bottom = (container.scrollTop + container.clientHeight - container.scrollHeight) === 0;
    var top = container.scrollTop === 0;
    var direction = e.wheelDelta;

    if ((bottom && direction < 1) || (top && direction > 1)) {
      e.stopPropagation();
      e.preventDefault();
      e.returnValue = false;

      return false;
    }
  }
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./defaults.js":5,"./dom.js":6,"./keys.js":8,"./list.js":9,"./render.js":10,"./util.js":11,"_process":3,"events":2}],8:[function(require,module,exports){
'use strict';

module.exports = {
  '38': 'up',
  '40': 'down',
  '13': 'enter',
  '27': 'escape'
};

},{}],9:[function(require,module,exports){
'use strict';

var dom = require('./dom.js');
var render = require('./render.js');
var util = require('./util.js');

module.exports = {
  create: createList
};

function createList(context, options) {
  var loadMore, loading, list, noResults;
  var items = [];
  context.container.innerHTML = '<ul' + (options.css.list ? ' class="' + options.css.list + '"' : '') + '></ul>';
  list = context.container.children[0];

  return {
    push: pushItem,
    clean: cleanItems,
    items: items,
    getByData: getByData,
    showLoading: showLoading,
    hideLoading: hideLoading,
    showLoadMore: showLoadMore,
    showNoResults: showNoResults,
    hasMoreItems: hasMoreItems
  };

  function pushItem(info, search) {
    var regExp;
    var itemElem = appendElement(options.templates.item, options.css.item, info);
    var item = { data: info, element: itemElem };

    if (search) {
      regExp = util.queryRegExp(search);
      itemElem.innerHTML = itemElem.innerHTML.replace(regExp, highlight);
    }

    itemElem.addEventListener('mousedown', function (e) {
      context.emit('change', info, itemElem);
    });

    hideLoading();
    list.appendChild(itemElem);
    items.push(item);
  }

  function highlight (str) {
    return '<span' + (options.css.match ? ' class="' + options.css.match + '"' : '') + '>' + str + '</span>';
  }

  function cleanItems() {
    items.splice(0, items.length);
    list.innerHTML = '';
    loadMore = null;
    loading = null;
    noResults = null;
  }

  function getByData(data) {
    return items.filter(function (item) { return item.data === data; })[0];
  }

  function showLoading(query) {
    hideLoadMore();
    hideNoResults();

    if (!loading) {
      loading = appendElement(options.templates.loading, options.css.loading, query);
    }

    return loading;
  }

  function hideLoading() {
    if (loading) {
      list.removeChild(loading);
      loading = null;
    }
  }

  function showLoadMore(result) {
    hideLoading();

    if (!loadMore) {
      loadMore = appendElement(options.templates.loadMore, options.css.loadMore, result);
    }

    if (!options.showLoadMore) {
      dom.addClass(loadMore, options.css.hide);
    }

    return loadMore;
  }

  function hideLoadMore() {
    if (loadMore) {
      list.removeChild(loadMore);
      loadMore = null;
    }
  }

  function showNoResults(result) {
    hideLoading();

    if (!loadMore) {
      noResults = appendElement(options.templates.noResults, options.css.noResults, result);
    }
  }

  function hideNoResults() {
    if (noResults) {
      list.removeChild(noResults);
      noResults = null;
    }
  }

  function hasMoreItems() {
    return !!(loadMore || loading);
  }

  function appendElement(template, className, obj) {
    var element = document.createElement('li');
    element.innerHTML = render(template, obj, true);
    element.className = className || '';
    list.appendChild(element);

    return element;
  }
}

},{"./dom.js":6,"./render.js":10,"./util.js":11}],10:[function(require,module,exports){
'use strict';

var mustache = require('mustache');

module.exports = render;

var htmlUnescapes = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': '\'',
  '&#x2F;': '/'
};
var reHtmlUnescapes = /&(?:amp|lt|gt|quot|#39|#x2F);/g;

function render(template, model, encode) {
  if (typeof template === 'function') {
    return template(model, encode);
  }
  else if (typeof template === 'string') {
    if (encode) {
      return mustache.render(template, model);
    }
    else {
      return mustache.render(template, model)
        .replace(reHtmlUnescapes, unescapeHtmlChar);
    }
  }
}

function unescapeHtmlChar(chr) {
  return htmlUnescapes[chr];
}

},{"mustache":4}],11:[function(require,module,exports){
'use strict';

module.exports = {
  merge: merge,
  queryRegExp: queryRegExp
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
  return new RegExp(escapeRegExp(query), 'ig');
}

function escapeRegExp (str) {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJib25hbnphLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL211c3RhY2hlL211c3RhY2hlLmpzIiwic3JjL2RlZmF1bHRzLmpzIiwic3JjL2RvbS5qcyIsInNyYy9pbmRleC5qcyIsInNyYy9rZXlzLmpzIiwic3JjL2xpc3QuanMiLCJzcmMvcmVuZGVyLmpzIiwic3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbm5CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjJyk7XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qIVxuICogbXVzdGFjaGUuanMgLSBMb2dpYy1sZXNzIHt7bXVzdGFjaGV9fSB0ZW1wbGF0ZXMgd2l0aCBKYXZhU2NyaXB0XG4gKiBodHRwOi8vZ2l0aHViLmNvbS9qYW5sL211c3RhY2hlLmpzXG4gKi9cblxuLypnbG9iYWwgZGVmaW5lOiBmYWxzZSBNdXN0YWNoZTogdHJ1ZSovXG5cbihmdW5jdGlvbiBkZWZpbmVNdXN0YWNoZSAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgZXhwb3J0cyAmJiB0eXBlb2YgZXhwb3J0cy5ub2RlTmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICBmYWN0b3J5KGV4cG9ydHMpOyAvLyBDb21tb25KU1xuICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSk7IC8vIEFNRFxuICB9IGVsc2Uge1xuICAgIGdsb2JhbC5NdXN0YWNoZSA9IHt9O1xuICAgIGZhY3RvcnkoTXVzdGFjaGUpOyAvLyBzY3JpcHQsIHdzaCwgYXNwXG4gIH1cbn0odGhpcywgZnVuY3Rpb24gbXVzdGFjaGVGYWN0b3J5IChtdXN0YWNoZSkge1xuXG4gIHZhciBvYmplY3RUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiBpc0FycmF5UG9seWZpbGwgKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3RUb1N0cmluZy5jYWxsKG9iamVjdCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgZnVuY3Rpb24gaXNGdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmplY3QgPT09ICdmdW5jdGlvbic7XG4gIH1cblxuICAvKipcbiAgICogTW9yZSBjb3JyZWN0IHR5cGVvZiBzdHJpbmcgaGFuZGxpbmcgYXJyYXlcbiAgICogd2hpY2ggbm9ybWFsbHkgcmV0dXJucyB0eXBlb2YgJ29iamVjdCdcbiAgICovXG4gIGZ1bmN0aW9uIHR5cGVTdHIgKG9iaikge1xuICAgIHJldHVybiBpc0FycmF5KG9iaikgPyAnYXJyYXknIDogdHlwZW9mIG9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIGVzY2FwZVJlZ0V4cCAoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bXFwtXFxbXFxde30oKSorPy4sXFxcXFxcXiR8I1xcc10vZywgJ1xcXFwkJicpO1xuICB9XG5cbiAgLyoqXG4gICAqIE51bGwgc2FmZSB3YXkgb2YgY2hlY2tpbmcgd2hldGhlciBvciBub3QgYW4gb2JqZWN0LFxuICAgKiBpbmNsdWRpbmcgaXRzIHByb3RvdHlwZSwgaGFzIGEgZ2l2ZW4gcHJvcGVydHlcbiAgICovXG4gIGZ1bmN0aW9uIGhhc1Byb3BlcnR5IChvYmosIHByb3BOYW1lKSB7XG4gICAgcmV0dXJuIG9iaiAhPSBudWxsICYmIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIChwcm9wTmFtZSBpbiBvYmopO1xuICB9XG5cbiAgLy8gV29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9pc3N1ZXMuYXBhY2hlLm9yZy9qaXJhL2Jyb3dzZS9DT1VDSERCLTU3N1xuICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2phbmwvbXVzdGFjaGUuanMvaXNzdWVzLzE4OVxuICB2YXIgcmVnRXhwVGVzdCA9IFJlZ0V4cC5wcm90b3R5cGUudGVzdDtcbiAgZnVuY3Rpb24gdGVzdFJlZ0V4cCAocmUsIHN0cmluZykge1xuICAgIHJldHVybiByZWdFeHBUZXN0LmNhbGwocmUsIHN0cmluZyk7XG4gIH1cblxuICB2YXIgbm9uU3BhY2VSZSA9IC9cXFMvO1xuICBmdW5jdGlvbiBpc1doaXRlc3BhY2UgKHN0cmluZykge1xuICAgIHJldHVybiAhdGVzdFJlZ0V4cChub25TcGFjZVJlLCBzdHJpbmcpO1xuICB9XG5cbiAgdmFyIGVudGl0eU1hcCA9IHtcbiAgICAnJic6ICcmYW1wOycsXG4gICAgJzwnOiAnJmx0OycsXG4gICAgJz4nOiAnJmd0OycsXG4gICAgJ1wiJzogJyZxdW90OycsXG4gICAgXCInXCI6ICcmIzM5OycsXG4gICAgJy8nOiAnJiN4MkY7J1xuICB9O1xuXG4gIGZ1bmN0aW9uIGVzY2FwZUh0bWwgKHN0cmluZykge1xuICAgIHJldHVybiBTdHJpbmcoc3RyaW5nKS5yZXBsYWNlKC9bJjw+XCInXFwvXS9nLCBmdW5jdGlvbiBmcm9tRW50aXR5TWFwIChzKSB7XG4gICAgICByZXR1cm4gZW50aXR5TWFwW3NdO1xuICAgIH0pO1xuICB9XG5cbiAgdmFyIHdoaXRlUmUgPSAvXFxzKi87XG4gIHZhciBzcGFjZVJlID0gL1xccysvO1xuICB2YXIgZXF1YWxzUmUgPSAvXFxzKj0vO1xuICB2YXIgY3VybHlSZSA9IC9cXHMqXFx9LztcbiAgdmFyIHRhZ1JlID0gLyN8XFxefFxcL3w+fFxce3wmfD18IS87XG5cbiAgLyoqXG4gICAqIEJyZWFrcyB1cCB0aGUgZ2l2ZW4gYHRlbXBsYXRlYCBzdHJpbmcgaW50byBhIHRyZWUgb2YgdG9rZW5zLiBJZiB0aGUgYHRhZ3NgXG4gICAqIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3byBzdHJpbmcgdmFsdWVzOiB0aGVcbiAgICogb3BlbmluZyBhbmQgY2xvc2luZyB0YWdzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIChlLmcuIFsgXCI8JVwiLCBcIiU+XCIgXSkuIE9mXG4gICAqIGNvdXJzZSwgdGhlIGRlZmF1bHQgaXMgdG8gdXNlIG11c3RhY2hlcyAoaS5lLiBtdXN0YWNoZS50YWdzKS5cbiAgICpcbiAgICogQSB0b2tlbiBpcyBhbiBhcnJheSB3aXRoIGF0IGxlYXN0IDQgZWxlbWVudHMuIFRoZSBmaXJzdCBlbGVtZW50IGlzIHRoZVxuICAgKiBtdXN0YWNoZSBzeW1ib2wgdGhhdCB3YXMgdXNlZCBpbnNpZGUgdGhlIHRhZywgZS5nLiBcIiNcIiBvciBcIiZcIi4gSWYgdGhlIHRhZ1xuICAgKiBkaWQgbm90IGNvbnRhaW4gYSBzeW1ib2wgKGkuZS4ge3tteVZhbHVlfX0pIHRoaXMgZWxlbWVudCBpcyBcIm5hbWVcIi4gRm9yXG4gICAqIGFsbCB0ZXh0IHRoYXQgYXBwZWFycyBvdXRzaWRlIGEgc3ltYm9sIHRoaXMgZWxlbWVudCBpcyBcInRleHRcIi5cbiAgICpcbiAgICogVGhlIHNlY29uZCBlbGVtZW50IG9mIGEgdG9rZW4gaXMgaXRzIFwidmFsdWVcIi4gRm9yIG11c3RhY2hlIHRhZ3MgdGhpcyBpc1xuICAgKiB3aGF0ZXZlciBlbHNlIHdhcyBpbnNpZGUgdGhlIHRhZyBiZXNpZGVzIHRoZSBvcGVuaW5nIHN5bWJvbC4gRm9yIHRleHQgdG9rZW5zXG4gICAqIHRoaXMgaXMgdGhlIHRleHQgaXRzZWxmLlxuICAgKlxuICAgKiBUaGUgdGhpcmQgYW5kIGZvdXJ0aCBlbGVtZW50cyBvZiB0aGUgdG9rZW4gYXJlIHRoZSBzdGFydCBhbmQgZW5kIGluZGljZXMsXG4gICAqIHJlc3BlY3RpdmVseSwgb2YgdGhlIHRva2VuIGluIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZS5cbiAgICpcbiAgICogVG9rZW5zIHRoYXQgYXJlIHRoZSByb290IG5vZGUgb2YgYSBzdWJ0cmVlIGNvbnRhaW4gdHdvIG1vcmUgZWxlbWVudHM6IDEpIGFuXG4gICAqIGFycmF5IG9mIHRva2VucyBpbiB0aGUgc3VidHJlZSBhbmQgMikgdGhlIGluZGV4IGluIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZSBhdFxuICAgKiB3aGljaCB0aGUgY2xvc2luZyB0YWcgZm9yIHRoYXQgc2VjdGlvbiBiZWdpbnMuXG4gICAqL1xuICBmdW5jdGlvbiBwYXJzZVRlbXBsYXRlICh0ZW1wbGF0ZSwgdGFncykge1xuICAgIGlmICghdGVtcGxhdGUpXG4gICAgICByZXR1cm4gW107XG5cbiAgICB2YXIgc2VjdGlvbnMgPSBbXTsgICAgIC8vIFN0YWNrIHRvIGhvbGQgc2VjdGlvbiB0b2tlbnNcbiAgICB2YXIgdG9rZW5zID0gW107ICAgICAgIC8vIEJ1ZmZlciB0byBob2xkIHRoZSB0b2tlbnNcbiAgICB2YXIgc3BhY2VzID0gW107ICAgICAgIC8vIEluZGljZXMgb2Ygd2hpdGVzcGFjZSB0b2tlbnMgb24gdGhlIGN1cnJlbnQgbGluZVxuICAgIHZhciBoYXNUYWcgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSB7e3RhZ319IG9uIHRoZSBjdXJyZW50IGxpbmU/XG4gICAgdmFyIG5vblNwYWNlID0gZmFsc2U7ICAvLyBJcyB0aGVyZSBhIG5vbi1zcGFjZSBjaGFyIG9uIHRoZSBjdXJyZW50IGxpbmU/XG5cbiAgICAvLyBTdHJpcHMgYWxsIHdoaXRlc3BhY2UgdG9rZW5zIGFycmF5IGZvciB0aGUgY3VycmVudCBsaW5lXG4gICAgLy8gaWYgdGhlcmUgd2FzIGEge3sjdGFnfX0gb24gaXQgYW5kIG90aGVyd2lzZSBvbmx5IHNwYWNlLlxuICAgIGZ1bmN0aW9uIHN0cmlwU3BhY2UgKCkge1xuICAgICAgaWYgKGhhc1RhZyAmJiAhbm9uU3BhY2UpIHtcbiAgICAgICAgd2hpbGUgKHNwYWNlcy5sZW5ndGgpXG4gICAgICAgICAgZGVsZXRlIHRva2Vuc1tzcGFjZXMucG9wKCldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3BhY2VzID0gW107XG4gICAgICB9XG5cbiAgICAgIGhhc1RhZyA9IGZhbHNlO1xuICAgICAgbm9uU3BhY2UgPSBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgb3BlbmluZ1RhZ1JlLCBjbG9zaW5nVGFnUmUsIGNsb3NpbmdDdXJseVJlO1xuICAgIGZ1bmN0aW9uIGNvbXBpbGVUYWdzICh0YWdzVG9Db21waWxlKSB7XG4gICAgICBpZiAodHlwZW9mIHRhZ3NUb0NvbXBpbGUgPT09ICdzdHJpbmcnKVxuICAgICAgICB0YWdzVG9Db21waWxlID0gdGFnc1RvQ29tcGlsZS5zcGxpdChzcGFjZVJlLCAyKTtcblxuICAgICAgaWYgKCFpc0FycmF5KHRhZ3NUb0NvbXBpbGUpIHx8IHRhZ3NUb0NvbXBpbGUubGVuZ3RoICE9PSAyKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdGFnczogJyArIHRhZ3NUb0NvbXBpbGUpO1xuXG4gICAgICBvcGVuaW5nVGFnUmUgPSBuZXcgUmVnRXhwKGVzY2FwZVJlZ0V4cCh0YWdzVG9Db21waWxlWzBdKSArICdcXFxccyonKTtcbiAgICAgIGNsb3NpbmdUYWdSZSA9IG5ldyBSZWdFeHAoJ1xcXFxzKicgKyBlc2NhcGVSZWdFeHAodGFnc1RvQ29tcGlsZVsxXSkpO1xuICAgICAgY2xvc2luZ0N1cmx5UmUgPSBuZXcgUmVnRXhwKCdcXFxccyonICsgZXNjYXBlUmVnRXhwKCd9JyArIHRhZ3NUb0NvbXBpbGVbMV0pKTtcbiAgICB9XG5cbiAgICBjb21waWxlVGFncyh0YWdzIHx8IG11c3RhY2hlLnRhZ3MpO1xuXG4gICAgdmFyIHNjYW5uZXIgPSBuZXcgU2Nhbm5lcih0ZW1wbGF0ZSk7XG5cbiAgICB2YXIgc3RhcnQsIHR5cGUsIHZhbHVlLCBjaHIsIHRva2VuLCBvcGVuU2VjdGlvbjtcbiAgICB3aGlsZSAoIXNjYW5uZXIuZW9zKCkpIHtcbiAgICAgIHN0YXJ0ID0gc2Nhbm5lci5wb3M7XG5cbiAgICAgIC8vIE1hdGNoIGFueSB0ZXh0IGJldHdlZW4gdGFncy5cbiAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwob3BlbmluZ1RhZ1JlKTtcblxuICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCB2YWx1ZUxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaSA8IHZhbHVlTGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBjaHIgPSB2YWx1ZS5jaGFyQXQoaSk7XG5cbiAgICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNocikpIHtcbiAgICAgICAgICAgIHNwYWNlcy5wdXNoKHRva2Vucy5sZW5ndGgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdG9rZW5zLnB1c2goWyAndGV4dCcsIGNociwgc3RhcnQsIHN0YXJ0ICsgMSBdKTtcbiAgICAgICAgICBzdGFydCArPSAxO1xuXG4gICAgICAgICAgLy8gQ2hlY2sgZm9yIHdoaXRlc3BhY2Ugb24gdGhlIGN1cnJlbnQgbGluZS5cbiAgICAgICAgICBpZiAoY2hyID09PSAnXFxuJylcbiAgICAgICAgICAgIHN0cmlwU3BhY2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBNYXRjaCB0aGUgb3BlbmluZyB0YWcuXG4gICAgICBpZiAoIXNjYW5uZXIuc2NhbihvcGVuaW5nVGFnUmUpKVxuICAgICAgICBicmVhaztcblxuICAgICAgaGFzVGFnID0gdHJ1ZTtcblxuICAgICAgLy8gR2V0IHRoZSB0YWcgdHlwZS5cbiAgICAgIHR5cGUgPSBzY2FubmVyLnNjYW4odGFnUmUpIHx8ICduYW1lJztcbiAgICAgIHNjYW5uZXIuc2Nhbih3aGl0ZVJlKTtcblxuICAgICAgLy8gR2V0IHRoZSB0YWcgdmFsdWUuXG4gICAgICBpZiAodHlwZSA9PT0gJz0nKSB7XG4gICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwoZXF1YWxzUmUpO1xuICAgICAgICBzY2FubmVyLnNjYW4oZXF1YWxzUmUpO1xuICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChjbG9zaW5nVGFnUmUpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAneycpIHtcbiAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChjbG9zaW5nQ3VybHlSZSk7XG4gICAgICAgIHNjYW5uZXIuc2NhbihjdXJseVJlKTtcbiAgICAgICAgc2Nhbm5lci5zY2FuVW50aWwoY2xvc2luZ1RhZ1JlKTtcbiAgICAgICAgdHlwZSA9ICcmJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwoY2xvc2luZ1RhZ1JlKTtcbiAgICAgIH1cblxuICAgICAgLy8gTWF0Y2ggdGhlIGNsb3NpbmcgdGFnLlxuICAgICAgaWYgKCFzY2FubmVyLnNjYW4oY2xvc2luZ1RhZ1JlKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmNsb3NlZCB0YWcgYXQgJyArIHNjYW5uZXIucG9zKTtcblxuICAgICAgdG9rZW4gPSBbIHR5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3MgXTtcbiAgICAgIHRva2Vucy5wdXNoKHRva2VuKTtcblxuICAgICAgaWYgKHR5cGUgPT09ICcjJyB8fCB0eXBlID09PSAnXicpIHtcbiAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICcvJykge1xuICAgICAgICAvLyBDaGVjayBzZWN0aW9uIG5lc3RpbmcuXG4gICAgICAgIG9wZW5TZWN0aW9uID0gc2VjdGlvbnMucG9wKCk7XG5cbiAgICAgICAgaWYgKCFvcGVuU2VjdGlvbilcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vub3BlbmVkIHNlY3Rpb24gXCInICsgdmFsdWUgKyAnXCIgYXQgJyArIHN0YXJ0KTtcblxuICAgICAgICBpZiAob3BlblNlY3Rpb25bMV0gIT09IHZhbHVlKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5jbG9zZWQgc2VjdGlvbiBcIicgKyBvcGVuU2VjdGlvblsxXSArICdcIiBhdCAnICsgc3RhcnQpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnbmFtZScgfHwgdHlwZSA9PT0gJ3snIHx8IHR5cGUgPT09ICcmJykge1xuICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICc9Jykge1xuICAgICAgICAvLyBTZXQgdGhlIHRhZ3MgZm9yIHRoZSBuZXh0IHRpbWUgYXJvdW5kLlxuICAgICAgICBjb21waWxlVGFncyh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTWFrZSBzdXJlIHRoZXJlIGFyZSBubyBvcGVuIHNlY3Rpb25zIHdoZW4gd2UncmUgZG9uZS5cbiAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuXG4gICAgaWYgKG9wZW5TZWN0aW9uKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmNsb3NlZCBzZWN0aW9uIFwiJyArIG9wZW5TZWN0aW9uWzFdICsgJ1wiIGF0ICcgKyBzY2FubmVyLnBvcyk7XG5cbiAgICByZXR1cm4gbmVzdFRva2VucyhzcXVhc2hUb2tlbnModG9rZW5zKSk7XG4gIH1cblxuICAvKipcbiAgICogQ29tYmluZXMgdGhlIHZhbHVlcyBvZiBjb25zZWN1dGl2ZSB0ZXh0IHRva2VucyBpbiB0aGUgZ2l2ZW4gYHRva2Vuc2AgYXJyYXlcbiAgICogdG8gYSBzaW5nbGUgdG9rZW4uXG4gICAqL1xuICBmdW5jdGlvbiBzcXVhc2hUb2tlbnMgKHRva2Vucykge1xuICAgIHZhciBzcXVhc2hlZFRva2VucyA9IFtdO1xuXG4gICAgdmFyIHRva2VuLCBsYXN0VG9rZW47XG4gICAgZm9yICh2YXIgaSA9IDAsIG51bVRva2VucyA9IHRva2Vucy5sZW5ndGg7IGkgPCBudW1Ub2tlbnM7ICsraSkge1xuICAgICAgdG9rZW4gPSB0b2tlbnNbaV07XG5cbiAgICAgIGlmICh0b2tlbikge1xuICAgICAgICBpZiAodG9rZW5bMF0gPT09ICd0ZXh0JyAmJiBsYXN0VG9rZW4gJiYgbGFzdFRva2VuWzBdID09PSAndGV4dCcpIHtcbiAgICAgICAgICBsYXN0VG9rZW5bMV0gKz0gdG9rZW5bMV07XG4gICAgICAgICAgbGFzdFRva2VuWzNdID0gdG9rZW5bM107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3F1YXNoZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgbGFzdFRva2VuID0gdG9rZW47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3F1YXNoZWRUb2tlbnM7XG4gIH1cblxuICAvKipcbiAgICogRm9ybXMgdGhlIGdpdmVuIGFycmF5IG9mIGB0b2tlbnNgIGludG8gYSBuZXN0ZWQgdHJlZSBzdHJ1Y3R1cmUgd2hlcmVcbiAgICogdG9rZW5zIHRoYXQgcmVwcmVzZW50IGEgc2VjdGlvbiBoYXZlIHR3byBhZGRpdGlvbmFsIGl0ZW1zOiAxKSBhbiBhcnJheSBvZlxuICAgKiBhbGwgdG9rZW5zIHRoYXQgYXBwZWFyIGluIHRoYXQgc2VjdGlvbiBhbmQgMikgdGhlIGluZGV4IGluIHRoZSBvcmlnaW5hbFxuICAgKiB0ZW1wbGF0ZSB0aGF0IHJlcHJlc2VudHMgdGhlIGVuZCBvZiB0aGF0IHNlY3Rpb24uXG4gICAqL1xuICBmdW5jdGlvbiBuZXN0VG9rZW5zICh0b2tlbnMpIHtcbiAgICB2YXIgbmVzdGVkVG9rZW5zID0gW107XG4gICAgdmFyIGNvbGxlY3RvciA9IG5lc3RlZFRva2VucztcbiAgICB2YXIgc2VjdGlvbnMgPSBbXTtcblxuICAgIHZhciB0b2tlbiwgc2VjdGlvbjtcbiAgICBmb3IgKHZhciBpID0gMCwgbnVtVG9rZW5zID0gdG9rZW5zLmxlbmd0aDsgaSA8IG51bVRva2VuczsgKytpKSB7XG4gICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcblxuICAgICAgc3dpdGNoICh0b2tlblswXSkge1xuICAgICAgY2FzZSAnIyc6XG4gICAgICBjYXNlICdeJzpcbiAgICAgICAgY29sbGVjdG9yLnB1c2godG9rZW4pO1xuICAgICAgICBzZWN0aW9ucy5wdXNoKHRva2VuKTtcbiAgICAgICAgY29sbGVjdG9yID0gdG9rZW5bNF0gPSBbXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICcvJzpcbiAgICAgICAgc2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuICAgICAgICBzZWN0aW9uWzVdID0gdG9rZW5bMl07XG4gICAgICAgIGNvbGxlY3RvciA9IHNlY3Rpb25zLmxlbmd0aCA+IDAgPyBzZWN0aW9uc1tzZWN0aW9ucy5sZW5ndGggLSAxXVs0XSA6IG5lc3RlZFRva2VucztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5lc3RlZFRva2VucztcbiAgfVxuXG4gIC8qKlxuICAgKiBBIHNpbXBsZSBzdHJpbmcgc2Nhbm5lciB0aGF0IGlzIHVzZWQgYnkgdGhlIHRlbXBsYXRlIHBhcnNlciB0byBmaW5kXG4gICAqIHRva2VucyBpbiB0ZW1wbGF0ZSBzdHJpbmdzLlxuICAgKi9cbiAgZnVuY3Rpb24gU2Nhbm5lciAoc3RyaW5nKSB7XG4gICAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG4gICAgdGhpcy50YWlsID0gc3RyaW5nO1xuICAgIHRoaXMucG9zID0gMDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgdGFpbCBpcyBlbXB0eSAoZW5kIG9mIHN0cmluZykuXG4gICAqL1xuICBTY2FubmVyLnByb3RvdHlwZS5lb3MgPSBmdW5jdGlvbiBlb3MgKCkge1xuICAgIHJldHVybiB0aGlzLnRhaWwgPT09ICcnO1xuICB9O1xuXG4gIC8qKlxuICAgKiBUcmllcyB0byBtYXRjaCB0aGUgZ2l2ZW4gcmVndWxhciBleHByZXNzaW9uIGF0IHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgKiBSZXR1cm5zIHRoZSBtYXRjaGVkIHRleHQgaWYgaXQgY2FuIG1hdGNoLCB0aGUgZW1wdHkgc3RyaW5nIG90aGVyd2lzZS5cbiAgICovXG4gIFNjYW5uZXIucHJvdG90eXBlLnNjYW4gPSBmdW5jdGlvbiBzY2FuIChyZSkge1xuICAgIHZhciBtYXRjaCA9IHRoaXMudGFpbC5tYXRjaChyZSk7XG5cbiAgICBpZiAoIW1hdGNoIHx8IG1hdGNoLmluZGV4ICE9PSAwKVxuICAgICAgcmV0dXJuICcnO1xuXG4gICAgdmFyIHN0cmluZyA9IG1hdGNoWzBdO1xuXG4gICAgdGhpcy50YWlsID0gdGhpcy50YWlsLnN1YnN0cmluZyhzdHJpbmcubGVuZ3RoKTtcbiAgICB0aGlzLnBvcyArPSBzdHJpbmcubGVuZ3RoO1xuXG4gICAgcmV0dXJuIHN0cmluZztcbiAgfTtcblxuICAvKipcbiAgICogU2tpcHMgYWxsIHRleHQgdW50aWwgdGhlIGdpdmVuIHJlZ3VsYXIgZXhwcmVzc2lvbiBjYW4gYmUgbWF0Y2hlZC4gUmV0dXJuc1xuICAgKiB0aGUgc2tpcHBlZCBzdHJpbmcsIHdoaWNoIGlzIHRoZSBlbnRpcmUgdGFpbCBpZiBubyBtYXRjaCBjYW4gYmUgbWFkZS5cbiAgICovXG4gIFNjYW5uZXIucHJvdG90eXBlLnNjYW5VbnRpbCA9IGZ1bmN0aW9uIHNjYW5VbnRpbCAocmUpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLnRhaWwuc2VhcmNoKHJlKSwgbWF0Y2g7XG5cbiAgICBzd2l0Y2ggKGluZGV4KSB7XG4gICAgY2FzZSAtMTpcbiAgICAgIG1hdGNoID0gdGhpcy50YWlsO1xuICAgICAgdGhpcy50YWlsID0gJyc7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDA6XG4gICAgICBtYXRjaCA9ICcnO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIG1hdGNoID0gdGhpcy50YWlsLnN1YnN0cmluZygwLCBpbmRleCk7XG4gICAgICB0aGlzLnRhaWwgPSB0aGlzLnRhaWwuc3Vic3RyaW5nKGluZGV4KTtcbiAgICB9XG5cbiAgICB0aGlzLnBvcyArPSBtYXRjaC5sZW5ndGg7XG5cbiAgICByZXR1cm4gbWF0Y2g7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSByZW5kZXJpbmcgY29udGV4dCBieSB3cmFwcGluZyBhIHZpZXcgb2JqZWN0IGFuZFxuICAgKiBtYWludGFpbmluZyBhIHJlZmVyZW5jZSB0byB0aGUgcGFyZW50IGNvbnRleHQuXG4gICAqL1xuICBmdW5jdGlvbiBDb250ZXh0ICh2aWV3LCBwYXJlbnRDb250ZXh0KSB7XG4gICAgdGhpcy52aWV3ID0gdmlldztcbiAgICB0aGlzLmNhY2hlID0geyAnLic6IHRoaXMudmlldyB9O1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50Q29udGV4dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGNvbnRleHQgdXNpbmcgdGhlIGdpdmVuIHZpZXcgd2l0aCB0aGlzIGNvbnRleHRcbiAgICogYXMgdGhlIHBhcmVudC5cbiAgICovXG4gIENvbnRleHQucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiBwdXNoICh2aWV3KSB7XG4gICAgcmV0dXJuIG5ldyBDb250ZXh0KHZpZXcsIHRoaXMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gbmFtZSBpbiB0aGlzIGNvbnRleHQsIHRyYXZlcnNpbmdcbiAgICogdXAgdGhlIGNvbnRleHQgaGllcmFyY2h5IGlmIHRoZSB2YWx1ZSBpcyBhYnNlbnQgaW4gdGhpcyBjb250ZXh0J3Mgdmlldy5cbiAgICovXG4gIENvbnRleHQucHJvdG90eXBlLmxvb2t1cCA9IGZ1bmN0aW9uIGxvb2t1cCAobmFtZSkge1xuICAgIHZhciBjYWNoZSA9IHRoaXMuY2FjaGU7XG5cbiAgICB2YXIgdmFsdWU7XG4gICAgaWYgKGNhY2hlLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICB2YWx1ZSA9IGNhY2hlW25hbWVdO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMsIG5hbWVzLCBpbmRleCwgbG9va3VwSGl0ID0gZmFsc2U7XG5cbiAgICAgIHdoaWxlIChjb250ZXh0KSB7XG4gICAgICAgIGlmIChuYW1lLmluZGV4T2YoJy4nKSA+IDApIHtcbiAgICAgICAgICB2YWx1ZSA9IGNvbnRleHQudmlldztcbiAgICAgICAgICBuYW1lcyA9IG5hbWUuc3BsaXQoJy4nKTtcbiAgICAgICAgICBpbmRleCA9IDA7XG5cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBVc2luZyB0aGUgZG90IG5vdGlvbiBwYXRoIGluIGBuYW1lYCwgd2UgZGVzY2VuZCB0aHJvdWdoIHRoZVxuICAgICAgICAgICAqIG5lc3RlZCBvYmplY3RzLlxuICAgICAgICAgICAqXG4gICAgICAgICAgICogVG8gYmUgY2VydGFpbiB0aGF0IHRoZSBsb29rdXAgaGFzIGJlZW4gc3VjY2Vzc2Z1bCwgd2UgaGF2ZSB0b1xuICAgICAgICAgICAqIGNoZWNrIGlmIHRoZSBsYXN0IG9iamVjdCBpbiB0aGUgcGF0aCBhY3R1YWxseSBoYXMgdGhlIHByb3BlcnR5XG4gICAgICAgICAgICogd2UgYXJlIGxvb2tpbmcgZm9yLiBXZSBzdG9yZSB0aGUgcmVzdWx0IGluIGBsb29rdXBIaXRgLlxuICAgICAgICAgICAqXG4gICAgICAgICAgICogVGhpcyBpcyBzcGVjaWFsbHkgbmVjZXNzYXJ5IGZvciB3aGVuIHRoZSB2YWx1ZSBoYXMgYmVlbiBzZXQgdG9cbiAgICAgICAgICAgKiBgdW5kZWZpbmVkYCBhbmQgd2Ugd2FudCB0byBhdm9pZCBsb29raW5nIHVwIHBhcmVudCBjb250ZXh0cy5cbiAgICAgICAgICAgKiovXG4gICAgICAgICAgd2hpbGUgKHZhbHVlICE9IG51bGwgJiYgaW5kZXggPCBuYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gbmFtZXMubGVuZ3RoIC0gMSlcbiAgICAgICAgICAgICAgbG9va3VwSGl0ID0gaGFzUHJvcGVydHkodmFsdWUsIG5hbWVzW2luZGV4XSk7XG5cbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbbmFtZXNbaW5kZXgrK11dO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IGNvbnRleHQudmlld1tuYW1lXTtcbiAgICAgICAgICBsb29rdXBIaXQgPSBoYXNQcm9wZXJ0eShjb250ZXh0LnZpZXcsIG5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxvb2t1cEhpdClcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjb250ZXh0ID0gY29udGV4dC5wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIGNhY2hlW25hbWVdID0gdmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKVxuICAgICAgdmFsdWUgPSB2YWx1ZS5jYWxsKHRoaXMudmlldyk7XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEEgV3JpdGVyIGtub3dzIGhvdyB0byB0YWtlIGEgc3RyZWFtIG9mIHRva2VucyBhbmQgcmVuZGVyIHRoZW0gdG8gYVxuICAgKiBzdHJpbmcsIGdpdmVuIGEgY29udGV4dC4gSXQgYWxzbyBtYWludGFpbnMgYSBjYWNoZSBvZiB0ZW1wbGF0ZXMgdG9cbiAgICogYXZvaWQgdGhlIG5lZWQgdG8gcGFyc2UgdGhlIHNhbWUgdGVtcGxhdGUgdHdpY2UuXG4gICAqL1xuICBmdW5jdGlvbiBXcml0ZXIgKCkge1xuICAgIHRoaXMuY2FjaGUgPSB7fTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhcnMgYWxsIGNhY2hlZCB0ZW1wbGF0ZXMgaW4gdGhpcyB3cml0ZXIuXG4gICAqL1xuICBXcml0ZXIucHJvdG90eXBlLmNsZWFyQ2FjaGUgPSBmdW5jdGlvbiBjbGVhckNhY2hlICgpIHtcbiAgICB0aGlzLmNhY2hlID0ge307XG4gIH07XG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhbmQgY2FjaGVzIHRoZSBnaXZlbiBgdGVtcGxhdGVgIGFuZCByZXR1cm5zIHRoZSBhcnJheSBvZiB0b2tlbnNcbiAgICogdGhhdCBpcyBnZW5lcmF0ZWQgZnJvbSB0aGUgcGFyc2UuXG4gICAqL1xuICBXcml0ZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24gcGFyc2UgKHRlbXBsYXRlLCB0YWdzKSB7XG4gICAgdmFyIGNhY2hlID0gdGhpcy5jYWNoZTtcbiAgICB2YXIgdG9rZW5zID0gY2FjaGVbdGVtcGxhdGVdO1xuXG4gICAgaWYgKHRva2VucyA9PSBudWxsKVxuICAgICAgdG9rZW5zID0gY2FjaGVbdGVtcGxhdGVdID0gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgdGFncyk7XG5cbiAgICByZXR1cm4gdG9rZW5zO1xuICB9O1xuXG4gIC8qKlxuICAgKiBIaWdoLWxldmVsIG1ldGhvZCB0aGF0IGlzIHVzZWQgdG8gcmVuZGVyIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHdpdGhcbiAgICogdGhlIGdpdmVuIGB2aWV3YC5cbiAgICpcbiAgICogVGhlIG9wdGlvbmFsIGBwYXJ0aWFsc2AgYXJndW1lbnQgbWF5IGJlIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZVxuICAgKiBuYW1lcyBhbmQgdGVtcGxhdGVzIG9mIHBhcnRpYWxzIHRoYXQgYXJlIHVzZWQgaW4gdGhlIHRlbXBsYXRlLiBJdCBtYXlcbiAgICogYWxzbyBiZSBhIGZ1bmN0aW9uIHRoYXQgaXMgdXNlZCB0byBsb2FkIHBhcnRpYWwgdGVtcGxhdGVzIG9uIHRoZSBmbHlcbiAgICogdGhhdCB0YWtlcyBhIHNpbmdsZSBhcmd1bWVudDogdGhlIG5hbWUgb2YgdGhlIHBhcnRpYWwuXG4gICAqL1xuICBXcml0ZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uIHJlbmRlciAodGVtcGxhdGUsIHZpZXcsIHBhcnRpYWxzKSB7XG4gICAgdmFyIHRva2VucyA9IHRoaXMucGFyc2UodGVtcGxhdGUpO1xuICAgIHZhciBjb250ZXh0ID0gKHZpZXcgaW5zdGFuY2VvZiBDb250ZXh0KSA/IHZpZXcgOiBuZXcgQ29udGV4dCh2aWV3KTtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5zLCBjb250ZXh0LCBwYXJ0aWFscywgdGVtcGxhdGUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBMb3ctbGV2ZWwgbWV0aG9kIHRoYXQgcmVuZGVycyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgdXNpbmdcbiAgICogdGhlIGdpdmVuIGBjb250ZXh0YCBhbmQgYHBhcnRpYWxzYC5cbiAgICpcbiAgICogTm90ZTogVGhlIGBvcmlnaW5hbFRlbXBsYXRlYCBpcyBvbmx5IGV2ZXIgdXNlZCB0byBleHRyYWN0IHRoZSBwb3J0aW9uXG4gICAqIG9mIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZSB0aGF0IHdhcyBjb250YWluZWQgaW4gYSBoaWdoZXItb3JkZXIgc2VjdGlvbi5cbiAgICogSWYgdGhlIHRlbXBsYXRlIGRvZXNuJ3QgdXNlIGhpZ2hlci1vcmRlciBzZWN0aW9ucywgdGhpcyBhcmd1bWVudCBtYXlcbiAgICogYmUgb21pdHRlZC5cbiAgICovXG4gIFdyaXRlci5wcm90b3R5cGUucmVuZGVyVG9rZW5zID0gZnVuY3Rpb24gcmVuZGVyVG9rZW5zICh0b2tlbnMsIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKSB7XG4gICAgdmFyIGJ1ZmZlciA9ICcnO1xuXG4gICAgdmFyIHRva2VuLCBzeW1ib2wsIHZhbHVlO1xuICAgIGZvciAodmFyIGkgPSAwLCBudW1Ub2tlbnMgPSB0b2tlbnMubGVuZ3RoOyBpIDwgbnVtVG9rZW5zOyArK2kpIHtcbiAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgdG9rZW4gPSB0b2tlbnNbaV07XG4gICAgICBzeW1ib2wgPSB0b2tlblswXTtcblxuICAgICAgaWYgKHN5bWJvbCA9PT0gJyMnKSB2YWx1ZSA9IHRoaXMucmVuZGVyU2VjdGlvbih0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgZWxzZSBpZiAoc3ltYm9sID09PSAnXicpIHZhbHVlID0gdGhpcy5yZW5kZXJJbnZlcnRlZCh0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgZWxzZSBpZiAoc3ltYm9sID09PSAnPicpIHZhbHVlID0gdGhpcy5yZW5kZXJQYXJ0aWFsKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICBlbHNlIGlmIChzeW1ib2wgPT09ICcmJykgdmFsdWUgPSB0aGlzLnVuZXNjYXBlZFZhbHVlKHRva2VuLCBjb250ZXh0KTtcbiAgICAgIGVsc2UgaWYgKHN5bWJvbCA9PT0gJ25hbWUnKSB2YWx1ZSA9IHRoaXMuZXNjYXBlZFZhbHVlKHRva2VuLCBjb250ZXh0KTtcbiAgICAgIGVsc2UgaWYgKHN5bWJvbCA9PT0gJ3RleHQnKSB2YWx1ZSA9IHRoaXMucmF3VmFsdWUodG9rZW4pO1xuXG4gICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZClcbiAgICAgICAgYnVmZmVyICs9IHZhbHVlO1xuICAgIH1cblxuICAgIHJldHVybiBidWZmZXI7XG4gIH07XG5cbiAgV3JpdGVyLnByb3RvdHlwZS5yZW5kZXJTZWN0aW9uID0gZnVuY3Rpb24gcmVuZGVyU2VjdGlvbiAodG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBidWZmZXIgPSAnJztcbiAgICB2YXIgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblsxXSk7XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gcmVuZGVyIGFuIGFyYml0cmFyeSB0ZW1wbGF0ZVxuICAgIC8vIGluIHRoZSBjdXJyZW50IGNvbnRleHQgYnkgaGlnaGVyLW9yZGVyIHNlY3Rpb25zLlxuICAgIGZ1bmN0aW9uIHN1YlJlbmRlciAodGVtcGxhdGUpIHtcbiAgICAgIHJldHVybiBzZWxmLnJlbmRlcih0ZW1wbGF0ZSwgY29udGV4dCwgcGFydGlhbHMpO1xuICAgIH1cblxuICAgIGlmICghdmFsdWUpIHJldHVybjtcblxuICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgZm9yICh2YXIgaiA9IDAsIHZhbHVlTGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBqIDwgdmFsdWVMZW5ndGg7ICsraikge1xuICAgICAgICBidWZmZXIgKz0gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bNF0sIGNvbnRleHQucHVzaCh2YWx1ZVtqXSksIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICBidWZmZXIgKz0gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bNF0sIGNvbnRleHQucHVzaCh2YWx1ZSksIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICBpZiAodHlwZW9mIG9yaWdpbmFsVGVtcGxhdGUgIT09ICdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCB1c2UgaGlnaGVyLW9yZGVyIHNlY3Rpb25zIHdpdGhvdXQgdGhlIG9yaWdpbmFsIHRlbXBsYXRlJyk7XG5cbiAgICAgIC8vIEV4dHJhY3QgdGhlIHBvcnRpb24gb2YgdGhlIG9yaWdpbmFsIHRlbXBsYXRlIHRoYXQgdGhlIHNlY3Rpb24gY29udGFpbnMuXG4gICAgICB2YWx1ZSA9IHZhbHVlLmNhbGwoY29udGV4dC52aWV3LCBvcmlnaW5hbFRlbXBsYXRlLnNsaWNlKHRva2VuWzNdLCB0b2tlbls1XSksIHN1YlJlbmRlcik7XG5cbiAgICAgIGlmICh2YWx1ZSAhPSBudWxsKVxuICAgICAgICBidWZmZXIgKz0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlbls0XSwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgIH1cbiAgICByZXR1cm4gYnVmZmVyO1xuICB9O1xuXG4gIFdyaXRlci5wcm90b3R5cGUucmVuZGVySW52ZXJ0ZWQgPSBmdW5jdGlvbiByZW5kZXJJbnZlcnRlZCAodG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKSB7XG4gICAgdmFyIHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bMV0pO1xuXG4gICAgLy8gVXNlIEphdmFTY3JpcHQncyBkZWZpbml0aW9uIG9mIGZhbHN5LiBJbmNsdWRlIGVtcHR5IGFycmF5cy5cbiAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2phbmwvbXVzdGFjaGUuanMvaXNzdWVzLzE4NlxuICAgIGlmICghdmFsdWUgfHwgKGlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkpXG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bNF0sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgfTtcblxuICBXcml0ZXIucHJvdG90eXBlLnJlbmRlclBhcnRpYWwgPSBmdW5jdGlvbiByZW5kZXJQYXJ0aWFsICh0b2tlbiwgY29udGV4dCwgcGFydGlhbHMpIHtcbiAgICBpZiAoIXBhcnRpYWxzKSByZXR1cm47XG5cbiAgICB2YXIgdmFsdWUgPSBpc0Z1bmN0aW9uKHBhcnRpYWxzKSA/IHBhcnRpYWxzKHRva2VuWzFdKSA6IHBhcnRpYWxzW3Rva2VuWzFdXTtcbiAgICBpZiAodmFsdWUgIT0gbnVsbClcbiAgICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0aGlzLnBhcnNlKHZhbHVlKSwgY29udGV4dCwgcGFydGlhbHMsIHZhbHVlKTtcbiAgfTtcblxuICBXcml0ZXIucHJvdG90eXBlLnVuZXNjYXBlZFZhbHVlID0gZnVuY3Rpb24gdW5lc2NhcGVkVmFsdWUgKHRva2VuLCBjb250ZXh0KSB7XG4gICAgdmFyIHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bMV0pO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIFdyaXRlci5wcm90b3R5cGUuZXNjYXBlZFZhbHVlID0gZnVuY3Rpb24gZXNjYXBlZFZhbHVlICh0b2tlbiwgY29udGV4dCkge1xuICAgIHZhciB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWzFdKTtcbiAgICBpZiAodmFsdWUgIT0gbnVsbClcbiAgICAgIHJldHVybiBtdXN0YWNoZS5lc2NhcGUodmFsdWUpO1xuICB9O1xuXG4gIFdyaXRlci5wcm90b3R5cGUucmF3VmFsdWUgPSBmdW5jdGlvbiByYXdWYWx1ZSAodG9rZW4pIHtcbiAgICByZXR1cm4gdG9rZW5bMV07XG4gIH07XG5cbiAgbXVzdGFjaGUubmFtZSA9ICdtdXN0YWNoZS5qcyc7XG4gIG11c3RhY2hlLnZlcnNpb24gPSAnMi4xLjMnO1xuICBtdXN0YWNoZS50YWdzID0gWyAne3snLCAnfX0nIF07XG5cbiAgLy8gQWxsIGhpZ2gtbGV2ZWwgbXVzdGFjaGUuKiBmdW5jdGlvbnMgdXNlIHRoaXMgd3JpdGVyLlxuICB2YXIgZGVmYXVsdFdyaXRlciA9IG5ldyBXcml0ZXIoKTtcblxuICAvKipcbiAgICogQ2xlYXJzIGFsbCBjYWNoZWQgdGVtcGxhdGVzIGluIHRoZSBkZWZhdWx0IHdyaXRlci5cbiAgICovXG4gIG11c3RhY2hlLmNsZWFyQ2FjaGUgPSBmdW5jdGlvbiBjbGVhckNhY2hlICgpIHtcbiAgICByZXR1cm4gZGVmYXVsdFdyaXRlci5jbGVhckNhY2hlKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhbmQgY2FjaGVzIHRoZSBnaXZlbiB0ZW1wbGF0ZSBpbiB0aGUgZGVmYXVsdCB3cml0ZXIgYW5kIHJldHVybnMgdGhlXG4gICAqIGFycmF5IG9mIHRva2VucyBpdCBjb250YWlucy4gRG9pbmcgdGhpcyBhaGVhZCBvZiB0aW1lIGF2b2lkcyB0aGUgbmVlZCB0b1xuICAgKiBwYXJzZSB0ZW1wbGF0ZXMgb24gdGhlIGZseSBhcyB0aGV5IGFyZSByZW5kZXJlZC5cbiAgICovXG4gIG11c3RhY2hlLnBhcnNlID0gZnVuY3Rpb24gcGFyc2UgKHRlbXBsYXRlLCB0YWdzKSB7XG4gICAgcmV0dXJuIGRlZmF1bHRXcml0ZXIucGFyc2UodGVtcGxhdGUsIHRhZ3MpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW5kZXJzIHRoZSBgdGVtcGxhdGVgIHdpdGggdGhlIGdpdmVuIGB2aWV3YCBhbmQgYHBhcnRpYWxzYCB1c2luZyB0aGVcbiAgICogZGVmYXVsdCB3cml0ZXIuXG4gICAqL1xuICBtdXN0YWNoZS5yZW5kZXIgPSBmdW5jdGlvbiByZW5kZXIgKHRlbXBsYXRlLCB2aWV3LCBwYXJ0aWFscykge1xuICAgIGlmICh0eXBlb2YgdGVtcGxhdGUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHRlbXBsYXRlISBUZW1wbGF0ZSBzaG91bGQgYmUgYSBcInN0cmluZ1wiICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAnYnV0IFwiJyArIHR5cGVTdHIodGVtcGxhdGUpICsgJ1wiIHdhcyBnaXZlbiBhcyB0aGUgZmlyc3QgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICdhcmd1bWVudCBmb3IgbXVzdGFjaGUjcmVuZGVyKHRlbXBsYXRlLCB2aWV3LCBwYXJ0aWFscyknKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmYXVsdFdyaXRlci5yZW5kZXIodGVtcGxhdGUsIHZpZXcsIHBhcnRpYWxzKTtcbiAgfTtcblxuICAvLyBUaGlzIGlzIGhlcmUgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHdpdGggMC40LnguLFxuICAvKmVzbGludC1kaXNhYmxlICovIC8vIGVzbGludCB3YW50cyBjYW1lbCBjYXNlZCBmdW5jdGlvbiBuYW1lXG4gIG11c3RhY2hlLnRvX2h0bWwgPSBmdW5jdGlvbiB0b19odG1sICh0ZW1wbGF0ZSwgdmlldywgcGFydGlhbHMsIHNlbmQpIHtcbiAgICAvKmVzbGludC1lbmFibGUqL1xuXG4gICAgdmFyIHJlc3VsdCA9IG11c3RhY2hlLnJlbmRlcih0ZW1wbGF0ZSwgdmlldywgcGFydGlhbHMpO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oc2VuZCkpIHtcbiAgICAgIHNlbmQocmVzdWx0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBlc2NhcGluZyBmdW5jdGlvbiBzbyB0aGF0IHRoZSB1c2VyIG1heSBvdmVycmlkZSBpdC5cbiAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qYW5sL211c3RhY2hlLmpzL2lzc3Vlcy8yNDRcbiAgbXVzdGFjaGUuZXNjYXBlID0gZXNjYXBlSHRtbDtcblxuICAvLyBFeHBvcnQgdGhlc2UgbWFpbmx5IGZvciB0ZXN0aW5nLCBidXQgYWxzbyBmb3IgYWR2YW5jZWQgdXNhZ2UuXG4gIG11c3RhY2hlLlNjYW5uZXIgPSBTY2FubmVyO1xuICBtdXN0YWNoZS5Db250ZXh0ID0gQ29udGV4dDtcbiAgbXVzdGFjaGUuV3JpdGVyID0gV3JpdGVyO1xuXG59KSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjc3MgPSB7XG4gIGNvbnRhaW5lcjogJ2J6LWNvbnRhaW5lcicsXG4gIGhpZGU6ICdiei1oaWRlJyxcbiAgbGlzdDogJ2J6LWxpc3QnLFxuICBpdGVtOiAnYnotbGlzdC1pdGVtJyxcbiAgc2VsZWN0ZWQ6ICdiei1saXN0LWl0ZW0tc2VsZWN0ZWQnLFxuICBsb2FkaW5nOiAnYnotbGlzdC1sb2FkaW5nJyxcbiAgbG9hZE1vcmU6ICdiei1saXN0LWxvYWQtbW9yZScsXG4gIG5vUmVzdWx0czogJ2J6LWxpc3Qtbm8tcmVzdWx0cycsXG4gIGlucHV0TG9hZGluZzogJ2J6LWxvYWRpbmcnLFxuICBtYXRjaDogJ2J6LXRleHQtbWF0Y2gnXG59O1xuXG52YXIgdGVtcGxhdGVzID0ge1xuICBpdGVtOiAne3sufX0nLFxuICBsYWJlbDogJ3t7Ln19JyxcbiAgbm9SZXN1bHRzOiAnTm8gcmVzdWx0cyBmb3IgXCJ7e3NlYXJjaH19XCInLFxuICBsb2FkTW9yZTogJy4uLicsXG4gIGxvYWRpbmc6ICdMb2FkaW5nIC4uLidcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB0ZW1wbGF0ZXM6IHRlbXBsYXRlcyxcbiAgY3NzOiBjc3MsXG4gIG9wZW5PbkZvY3VzOiB0cnVlLFxuICBzaG93TG9hZGluZzogdHJ1ZSxcbiAgc2hvd2xvYWRNb3JlOiB0cnVlLFxuICBsaW1pdDogMTAsXG4gIHNjcm9sbERpc3RhbmNlOiAwLFxuICBoYXNNb3JlSXRlbXM6IGZ1bmN0aW9uIChyZXN1bHQpIHsgcmV0dXJuICEhcmVzdWx0Lmxlbmd0aCAmJiByZXN1bHQubGVuZ3RoID09PSB0aGlzLmxpbWl0OyB9LFxuICBnZXRJdGVtczogZnVuY3Rpb24gKHJlc3VsdCkgeyByZXR1cm4gcmVzdWx0OyB9LFxuICBjbG9zZU9uQmx1cjogdHJ1ZVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFkZENsYXNzOiBhZGRDbGFzcyxcbiAgcmVtb3ZlQ2xhc3M6IHJlbW92ZUNsYXNzLFxuICBoYXNDbGFzczogaGFzQ2xhc3Ncbn07XG5cbmZ1bmN0aW9uIGFkZENsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICBpZiAoIWNsYXNzTmFtZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghaGFzQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSkge1xuICAgIGVsZW1lbnQuY2xhc3NOYW1lID0gKGVsZW1lbnQuY2xhc3NOYW1lICsgKGVsZW1lbnQuY2xhc3NOYW1lID8gJyAnIDogJycpICsgY2xhc3NOYW1lKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgaWYgKCFjbGFzc05hbWUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgY2xhc3NSZWdleCA9IG5ldyBSZWdFeHAoJ1xcXFxiJyArIGNsYXNzTmFtZSArICdcXFxcYicsICdnJyk7XG4gIGVsZW1lbnQuY2xhc3NOYW1lID0gZWxlbWVudC5jbGFzc05hbWUucmVwbGFjZShjbGFzc1JlZ2V4LCAnJykucmVwbGFjZSgvICAvZywgJyAnKS50cmltKCk7XG59XG5cbmZ1bmN0aW9uIGhhc0NsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICB2YXIgY2xhc3NlcyA9IGVsZW1lbnQuY2xhc3NOYW1lLnNwbGl0KCcgJyk7XG5cbiAgcmV0dXJuIGNsYXNzZXMuaW5kZXhPZihjbGFzc05hbWUpICE9PSAtMTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBkb20gPSByZXF1aXJlKCcuL2RvbS5qcycpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi9kZWZhdWx0cy5qcycpO1xudmFyIGtleXMgPSByZXF1aXJlKCcuL2tleXMuanMnKTtcbnZhciBsaXN0ID0gcmVxdWlyZSgnLi9saXN0LmpzJyk7XG52YXIgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXIuanMnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsLmpzJyk7XG5cbmJvbmFuemEuZGVmYXVsdHMgPSBkZWZhdWx0cztcbmJvbmFuemEucmVuZGVyID0gcmVuZGVyO1xuZ2xvYmFsLmJvbmFuemEgPSBib25hbnphO1xubW9kdWxlLmV4cG9ydHMgPSBib25hbnphO1xuXG5mdW5jdGlvbiBib25hbnphKGVsZW1lbnQsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIGlmICghZWxlbWVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQW4gZWxlbWVudCBpcyByZXF1aXJlZCB0byBpbml0aWFsaXplIGJvbmFuemEnKTtcbiAgfVxuXG4gIGlmICghY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG5cbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHRocm93IG5ldyBFcnJvcignQSBzb3VyY2UgaXMgcmVxdWlyZWQgdG8gaW5pdGlhbGl6ZSBib25hbnphJyk7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheShjYWxsYmFjaykpIHtcbiAgICBjYWxsYmFjayA9IGJ1aWxkQ2FsbGJhY2tGcm9tQXJyYXkoY2FsbGJhY2spO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMudGVtcGxhdGVzKSB7XG4gICAgaWYgKG9wdGlvbnMudGVtcGxhdGVzLml0ZW0gJiYgb3B0aW9ucy50ZW1wbGF0ZXMubGFiZWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgb3B0aW9ucy50ZW1wbGF0ZXMubGFiZWwgPSBvcHRpb25zLnRlbXBsYXRlcy5pdGVtO1xuICAgIH1cblxuICAgIG9wdGlvbnMudGVtcGxhdGVzID0gdXRpbC5tZXJnZShkZWZhdWx0cy50ZW1wbGF0ZXMsIG9wdGlvbnMudGVtcGxhdGVzKTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmNzcykge1xuICAgIG9wdGlvbnMuY3NzID0gdXRpbC5tZXJnZShkZWZhdWx0cy5jc3MsIG9wdGlvbnMuY3NzKTtcbiAgfVxuXG4gIG9wdGlvbnMgPSB1dGlsLm1lcmdlKGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICB2YXIgY29udGV4dCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgdmFyIHNlbGVjdGVkSXRlbSwgbGFzdFF1ZXJ5LCBpbml0aWFsU3RhdGU7XG5cbiAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBjb250YWluZXIuY2xhc3NOYW1lID0gb3B0aW9ucy5jc3MuY29udGFpbmVyIHx8ICcnO1xuICBlbGVtZW50LnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcbiAgZG9tLmFkZENsYXNzKGNvbnRhaW5lciwgb3B0aW9ucy5jc3MuaGlkZSk7XG5cbiAgY29udGV4dC5jb250YWluZXIgPSBjb250YWluZXI7XG4gIGNvbnRleHQuaW5wdXQgPSBlbGVtZW50O1xuICBjb250ZXh0Lm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gIHZhciBkYXRhTGlzdCA9IGxpc3QuY3JlYXRlKGNvbnRleHQsIG9wdGlvbnMpO1xuXG4gIGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBib3R0b20gPSBlLnRhcmdldC5zY3JvbGxUb3AgKyBlLnRhcmdldC5jbGllbnRIZWlnaHQgLSBlLnRhcmdldC5zY3JvbGxIZWlnaHQ7XG5cbiAgICBpZiAoYm90dG9tID49ICgtMSAqIG9wdGlvbnMuc2Nyb2xsRGlzdGFuY2UpICYmIGRhdGFMaXN0Lmhhc01vcmVJdGVtcygpICYmIGluaXRpYWxTdGF0ZSkge1xuICAgICAgY29udGV4dC5lbWl0KCdzZWFyY2gnLCB7IG9mZnNldDogZGF0YUxpc3QuaXRlbXMubGVuZ3RoLCBsaW1pdDogb3B0aW9ucy5saW1pdCwgc2VhcmNoOiBpbml0aWFsU3RhdGUuc2VhcmNoVGVybSB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnRhaW5lci5vbm1vdXNld2hlZWwgPSBoYW5kbGVNb3VzZVdoZWVsO1xuXG4gIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgY29udGV4dC5lbWl0KCdmb2N1cycpO1xuICB9KTtcblxuICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChvcHRpb25zLmNsb3NlT25CbHVyKSB7XG4gICAgICBjb250ZXh0LmVtaXQoJ2Nsb3NlJyk7XG4gICAgfVxuICB9KTtcblxuICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoIShlLmtleUNvZGUudG9TdHJpbmcoKSBpbiBrZXlzKSkge1xuICAgICAgc2hvd0xpc3QoKTtcbiAgICAgIGNvbnRleHQuZW1pdCgnc2VhcmNoJywgeyBvZmZzZXQ6IDAsIGxpbWl0OiBvcHRpb25zLmxpbWl0LCBzZWFyY2g6IGVsZW1lbnQudmFsdWUgfSk7XG4gICAgfVxuICB9KTtcblxuICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBsYXN0SW5kZXgsIG5vZGVJbmRleDtcbiAgICB2YXIga2V5ID0ga2V5c1tlLmtleUNvZGVdO1xuXG4gICAgaWYgKHNlbGVjdGVkSXRlbSkge1xuICAgICAgbGFzdEluZGV4ID0gZGF0YUxpc3QuaXRlbXMuaW5kZXhPZihzZWxlY3RlZEl0ZW0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGxhc3RJbmRleCA9IDA7XG4gICAgfVxuXG4gICAgaWYgKGtleSA9PT0gJ3VwJykge1xuICAgICAgbm9kZUluZGV4ID0gKGxhc3RJbmRleCB8fCAwKSAtIDE7XG5cbiAgICAgIGlmIChub2RlSW5kZXggPT09IC0xICYmIGRhdGFMaXN0Lmhhc01vcmVJdGVtcygpKSB7XG4gICAgICAgIG5vZGVJbmRleCA9IDA7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChub2RlSW5kZXggPCAwKSB7XG4gICAgICAgIG5vZGVJbmRleCA9IGRhdGFMaXN0Lml0ZW1zLmxlbmd0aCAtIDE7XG4gICAgICB9XG5cbiAgICAgIHNob3dMaXN0KCk7XG4gICAgICBjb250ZXh0LmVtaXQoJ3NlbGVjdCcsIGRhdGFMaXN0Lml0ZW1zW25vZGVJbmRleF0uZGF0YSk7XG4gICAgfVxuXG4gICAgZWxzZSBpZiAoa2V5ID09PSAnZG93bicpIHtcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW0pIHtcbiAgICAgICAgbm9kZUluZGV4ID0gbGFzdEluZGV4ICsgMTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBub2RlSW5kZXggPSAwO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWRhdGFMaXN0Lmhhc01vcmVJdGVtcygpICYmIG5vZGVJbmRleCA+IGRhdGFMaXN0Lml0ZW1zLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgbm9kZUluZGV4ID0gMDtcbiAgICAgIH1cblxuICAgICAgaWYgKCFkYXRhTGlzdC5pdGVtcy5sZW5ndGggfHwgKGRhdGFMaXN0Lmhhc01vcmVJdGVtcygpICYmIG5vZGVJbmRleCA+PSBkYXRhTGlzdC5pdGVtcy5sZW5ndGggLSAyKSkge1xuICAgICAgICBzaG93TGlzdCgpO1xuICAgICAgICBjb250ZXh0LmVtaXQoJ3NlYXJjaCcsIHsgb2Zmc2V0OiBkYXRhTGlzdC5pdGVtcy5sZW5ndGgsIGxpbWl0OiBvcHRpb25zLmxpbWl0LCBzZWFyY2g6IGluaXRpYWxTdGF0ZSA/IGluaXRpYWxTdGF0ZS5zZWFyY2hUZXJtIDogZWxlbWVudC52YWx1ZSB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGRhdGFMaXN0Lml0ZW1zW25vZGVJbmRleF0pIHtcbiAgICAgICAgY29udGV4dC5lbWl0KCdzZWxlY3QnLCBkYXRhTGlzdC5pdGVtc1tub2RlSW5kZXhdLmRhdGEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGVsc2UgaWYgKGtleSA9PT0gJ2VudGVyJyAmJiBpc1Zpc2libGUoKSkge1xuICAgICAgc2VsZWN0ZWRJdGVtID0gc2VsZWN0ZWRJdGVtIHx8IGRhdGFMaXN0Lml0ZW1zWzBdO1xuXG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtKSB7XG4gICAgICAgIGNvbnRleHQuZW1pdCgnY2hhbmdlJywgc2VsZWN0ZWRJdGVtLmRhdGEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGVsc2UgaWYgKGtleSA9PT0gJ2VzY2FwZScgJiYgaXNWaXNpYmxlKCkpIHtcbiAgICAgIGNvbnRleHQuZW1pdCgnY2FuY2VsJyk7XG4gICAgfVxuICB9KTtcblxuICBjb250ZXh0Lm9uKCdmb2N1cycsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAob3B0aW9ucy5vcGVuT25Gb2N1cykge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhlbGVtZW50LnNldFNlbGVjdGlvblJhbmdlLmJpbmQoZWxlbWVudCwgMCwgZWxlbWVudC52YWx1ZS5sZW5ndGgpKTtcbiAgICAgIGNvbnRleHQuZW1pdCgnc2VhcmNoJywgeyBvZmZzZXQ6IDAsIGxpbWl0OiBvcHRpb25zLmxpbWl0LCBzZWFyY2g6IGVsZW1lbnQudmFsdWUgfSk7XG4gICAgfVxuICB9KTtcblxuICBjb250ZXh0Lm9uKCdvcGVuJywgZnVuY3Rpb24gKCkge1xuICAgIGRvbS5yZW1vdmVDbGFzcyhjb250YWluZXIsIG9wdGlvbnMuY3NzLmhpZGUpO1xuICAgIGNvbnRhaW5lci5zdHlsZS50b3AgPSAoZWxlbWVudC5vZmZzZXRUb3AgKyBlbGVtZW50Lm9mZnNldEhlaWdodCkgKyAncHgnO1xuICAgIGNvbnRhaW5lci5zdHlsZS5sZWZ0ID0gKGVsZW1lbnQub2Zmc2V0TGVmdCkgKyAncHgnO1xuICB9KTtcblxuICBjb250ZXh0Lm9uKCdjbG9zZScsIGZ1bmN0aW9uICgpIHtcbiAgICBkYXRhTGlzdC5jbGVhbigpO1xuICAgIGRvbS5hZGRDbGFzcyhjb250YWluZXIsIG9wdGlvbnMuY3NzLmhpZGUpO1xuICAgIHNlbGVjdGVkSXRlbSA9IG51bGw7XG4gICAgbGFzdFF1ZXJ5ID0gbnVsbDtcbiAgfSk7XG5cbiAgY29udGV4dC5vbignY2hhbmdlJywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICBpZiAoaXRlbSkge1xuICAgICAgZWxlbWVudC52YWx1ZSA9IHJlbmRlcihvcHRpb25zLnRlbXBsYXRlcy5sYWJlbCwgaXRlbSwgZmFsc2UpO1xuICAgIH1cblxuICAgIGluaXRpYWxTdGF0ZSA9IG51bGw7XG4gICAgY29udGV4dC5lbWl0KCdjbG9zZScpO1xuICB9KTtcblxuICBjb250ZXh0Lm9uKCdzZWxlY3QnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGlmIChzZWxlY3RlZEl0ZW0pIHtcbiAgICAgIGRvbS5yZW1vdmVDbGFzcyhzZWxlY3RlZEl0ZW0uZWxlbWVudCwgb3B0aW9ucy5jc3Muc2VsZWN0ZWQpO1xuICAgIH1cblxuICAgIHNlbGVjdGVkSXRlbSA9IGRhdGFMaXN0LmdldEJ5RGF0YShkYXRhKTtcblxuICAgIGlmIChzZWxlY3RlZEl0ZW0pIHtcbiAgICAgIGVsZW1lbnQudmFsdWUgPSByZW5kZXIob3B0aW9ucy50ZW1wbGF0ZXMubGFiZWwsIGRhdGEsIGZhbHNlKTtcbiAgICAgIGRvbS5hZGRDbGFzcyhzZWxlY3RlZEl0ZW0uZWxlbWVudCwgb3B0aW9ucy5jc3Muc2VsZWN0ZWQpO1xuICAgICAgdmFyIHRvcCA9IHNlbGVjdGVkSXRlbS5lbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgIHZhciBib3R0b20gPSBzZWxlY3RlZEl0ZW0uZWxlbWVudC5vZmZzZXRUb3AgKyBzZWxlY3RlZEl0ZW0uZWxlbWVudC5vZmZzZXRIZWlnaHQ7XG5cbiAgICAgIGlmIChib3R0b20gPiBjb250YWluZXIuY2xpZW50SGVpZ2h0ICsgY29udGFpbmVyLnNjcm9sbFRvcCkge1xuICAgICAgICBjb250YWluZXIuc2Nyb2xsVG9wID0gc2VsZWN0ZWRJdGVtLmVsZW1lbnQub2Zmc2V0VG9wIC0gY29udGFpbmVyLmNsaWVudEhlaWdodCArIHNlbGVjdGVkSXRlbS5lbGVtZW50Lm9mZnNldEhlaWdodDtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRvcCA8IGNvbnRhaW5lci5zY3JvbGxUb3ApIHtcbiAgICAgICAgY29udGFpbmVyLnNjcm9sbFRvcCA9IHNlbGVjdGVkSXRlbS5lbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGNvbnRleHQub24oJ2NhbmNlbCcsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoaW5pdGlhbFN0YXRlKSB7XG4gICAgICBlbGVtZW50LnZhbHVlID0gaW5pdGlhbFN0YXRlLnNlYXJjaFRlcm07XG4gICAgICBpbml0aWFsU3RhdGUgPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnRleHQuZW1pdCgnY2xvc2UnKTtcbiAgfSk7XG5cbiAgY29udGV4dC5vbignc2VhcmNoJywgZnVuY3Rpb24gKHF1ZXJ5KSB7XG4gICAgaWYgKGxhc3RRdWVyeSAmJiBsYXN0UXVlcnkuc2VhcmNoID09PSBxdWVyeS5zZWFyY2ggJiYgbGFzdFF1ZXJ5Lm9mZnNldCA9PT0gcXVlcnkub2Zmc2V0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHF1ZXJ5Lm9mZnNldCA9PT0gMCkge1xuICAgICAgaW5pdGlhbFN0YXRlID0geyBvbGRWYWx1ZTogZWxlbWVudC52YWx1ZSwgc2VhcmNoVGVybTogcXVlcnkuc2VhcmNoIH07XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuc2hvd0xvYWRpbmcpIHtcbiAgICAgIGRhdGFMaXN0LnNob3dMb2FkaW5nKHF1ZXJ5KTtcbiAgICAgIGRvbS5hZGRDbGFzcyhlbGVtZW50LCBvcHRpb25zLmNzcy5pbnB1dExvYWRpbmcpO1xuICAgIH1cblxuICAgIHNob3dMaXN0KCk7XG5cbiAgICBsYXN0UXVlcnkgPSBxdWVyeTtcbiAgICBjYWxsYmFjayhxdWVyeSwgZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgICBkYXRhTGlzdC5oaWRlTG9hZGluZygpO1xuICAgICAgZG9tLnJlbW92ZUNsYXNzKGVsZW1lbnQsIG9wdGlvbnMuY3NzLmlucHV0TG9hZGluZyk7XG5cbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgY29udGV4dC5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGxhc3RRdWVyeSA9PT0gcXVlcnkpIHtcbiAgICAgICAgY29udGV4dC5lbWl0KCdzdWNjZXNzJywgcmVzdWx0LCBxdWVyeSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuXG4gIGNvbnRleHQub24oJ3N1Y2Nlc3MnLCBmdW5jdGlvbiAocmVzdWx0LCBxdWVyeSkge1xuICAgIHZhciBpdGVtcyA9IG9wdGlvbnMuZ2V0SXRlbXMocmVzdWx0KTtcblxuICAgIGlmIChxdWVyeS5vZmZzZXQgPT09IDApIHtcbiAgICAgIGRhdGFMaXN0LmNsZWFuKCk7XG4gICAgfVxuXG4gICAgaWYgKGl0ZW1zKSB7XG4gICAgICBzaG93TGlzdCgpO1xuXG4gICAgICBpdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIGRhdGFMaXN0LnB1c2goaXRlbSwgcXVlcnkuc2VhcmNoKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAob3B0aW9ucy5oYXNNb3JlSXRlbXMocmVzdWx0KSkge1xuICAgICAgICBkYXRhTGlzdC5zaG93TG9hZE1vcmUocmVzdWx0KTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKCFkYXRhTGlzdC5pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgZGF0YUxpc3Quc2hvd05vUmVzdWx0cyhxdWVyeSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gY29udGV4dDtcblxuICBmdW5jdGlvbiBpc1Zpc2libGUoKSB7XG4gICAgcmV0dXJuICFkb20uaGFzQ2xhc3MoY29udGFpbmVyLCBvcHRpb25zLmNzcy5oaWRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dMaXN0KCkge1xuICAgIGlmICghaXNWaXNpYmxlKCkpIHtcbiAgICAgIGNvbnRleHQuZW1pdCgnb3BlbicpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1aWxkQ2FsbGJhY2tGcm9tQXJyYXkoYXJyYXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHF1ZXJ5LCBkb25lKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gYXJyYXlcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgIHZhciBkZXNjID0gcmVuZGVyKG9wdGlvbnMudGVtcGxhdGVzLmxhYmVsLCBpdGVtLCBmYWxzZSk7XG5cbiAgICAgICAgICByZXR1cm4gdXRpbC5xdWVyeVJlZ0V4cChxdWVyeS5zZWFyY2gpLnRlc3QoZGVzYyk7XG4gICAgICAgIH0pXG4gICAgICAgIC5zbGljZShxdWVyeS5vZmZzZXQsIHF1ZXJ5Lm9mZnNldCArIHF1ZXJ5LmxpbWl0KTtcblxuICAgICAgZG9uZShudWxsLCByZXN1bHQpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVNb3VzZVdoZWVsKGUpIHtcbiAgICB2YXIgYm90dG9tID0gKGNvbnRhaW5lci5zY3JvbGxUb3AgKyBjb250YWluZXIuY2xpZW50SGVpZ2h0IC0gY29udGFpbmVyLnNjcm9sbEhlaWdodCkgPT09IDA7XG4gICAgdmFyIHRvcCA9IGNvbnRhaW5lci5zY3JvbGxUb3AgPT09IDA7XG4gICAgdmFyIGRpcmVjdGlvbiA9IGUud2hlZWxEZWx0YTtcblxuICAgIGlmICgoYm90dG9tICYmIGRpcmVjdGlvbiA8IDEpIHx8ICh0b3AgJiYgZGlyZWN0aW9uID4gMSkpIHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBlLnJldHVyblZhbHVlID0gZmFsc2U7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICczOCc6ICd1cCcsXG4gICc0MCc6ICdkb3duJyxcbiAgJzEzJzogJ2VudGVyJyxcbiAgJzI3JzogJ2VzY2FwZSdcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkb20gPSByZXF1aXJlKCcuL2RvbS5qcycpO1xudmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyLmpzJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY3JlYXRlOiBjcmVhdGVMaXN0XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVMaXN0KGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGxvYWRNb3JlLCBsb2FkaW5nLCBsaXN0LCBub1Jlc3VsdHM7XG4gIHZhciBpdGVtcyA9IFtdO1xuICBjb250ZXh0LmNvbnRhaW5lci5pbm5lckhUTUwgPSAnPHVsJyArIChvcHRpb25zLmNzcy5saXN0ID8gJyBjbGFzcz1cIicgKyBvcHRpb25zLmNzcy5saXN0ICsgJ1wiJyA6ICcnKSArICc+PC91bD4nO1xuICBsaXN0ID0gY29udGV4dC5jb250YWluZXIuY2hpbGRyZW5bMF07XG5cbiAgcmV0dXJuIHtcbiAgICBwdXNoOiBwdXNoSXRlbSxcbiAgICBjbGVhbjogY2xlYW5JdGVtcyxcbiAgICBpdGVtczogaXRlbXMsXG4gICAgZ2V0QnlEYXRhOiBnZXRCeURhdGEsXG4gICAgc2hvd0xvYWRpbmc6IHNob3dMb2FkaW5nLFxuICAgIGhpZGVMb2FkaW5nOiBoaWRlTG9hZGluZyxcbiAgICBzaG93TG9hZE1vcmU6IHNob3dMb2FkTW9yZSxcbiAgICBzaG93Tm9SZXN1bHRzOiBzaG93Tm9SZXN1bHRzLFxuICAgIGhhc01vcmVJdGVtczogaGFzTW9yZUl0ZW1zXG4gIH07XG5cbiAgZnVuY3Rpb24gcHVzaEl0ZW0oaW5mbywgc2VhcmNoKSB7XG4gICAgdmFyIHJlZ0V4cDtcbiAgICB2YXIgaXRlbUVsZW0gPSBhcHBlbmRFbGVtZW50KG9wdGlvbnMudGVtcGxhdGVzLml0ZW0sIG9wdGlvbnMuY3NzLml0ZW0sIGluZm8pO1xuICAgIHZhciBpdGVtID0geyBkYXRhOiBpbmZvLCBlbGVtZW50OiBpdGVtRWxlbSB9O1xuXG4gICAgaWYgKHNlYXJjaCkge1xuICAgICAgcmVnRXhwID0gdXRpbC5xdWVyeVJlZ0V4cChzZWFyY2gpO1xuICAgICAgaXRlbUVsZW0uaW5uZXJIVE1MID0gaXRlbUVsZW0uaW5uZXJIVE1MLnJlcGxhY2UocmVnRXhwLCBoaWdobGlnaHQpO1xuICAgIH1cblxuICAgIGl0ZW1FbGVtLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICBjb250ZXh0LmVtaXQoJ2NoYW5nZScsIGluZm8sIGl0ZW1FbGVtKTtcbiAgICB9KTtcblxuICAgIGhpZGVMb2FkaW5nKCk7XG4gICAgbGlzdC5hcHBlbmRDaGlsZChpdGVtRWxlbSk7XG4gICAgaXRlbXMucHVzaChpdGVtKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhpZ2hsaWdodCAoc3RyKSB7XG4gICAgcmV0dXJuICc8c3BhbicgKyAob3B0aW9ucy5jc3MubWF0Y2ggPyAnIGNsYXNzPVwiJyArIG9wdGlvbnMuY3NzLm1hdGNoICsgJ1wiJyA6ICcnKSArICc+JyArIHN0ciArICc8L3NwYW4+JztcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFuSXRlbXMoKSB7XG4gICAgaXRlbXMuc3BsaWNlKDAsIGl0ZW1zLmxlbmd0aCk7XG4gICAgbGlzdC5pbm5lckhUTUwgPSAnJztcbiAgICBsb2FkTW9yZSA9IG51bGw7XG4gICAgbG9hZGluZyA9IG51bGw7XG4gICAgbm9SZXN1bHRzID0gbnVsbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEJ5RGF0YShkYXRhKSB7XG4gICAgcmV0dXJuIGl0ZW1zLmZpbHRlcihmdW5jdGlvbiAoaXRlbSkgeyByZXR1cm4gaXRlbS5kYXRhID09PSBkYXRhOyB9KVswXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dMb2FkaW5nKHF1ZXJ5KSB7XG4gICAgaGlkZUxvYWRNb3JlKCk7XG4gICAgaGlkZU5vUmVzdWx0cygpO1xuXG4gICAgaWYgKCFsb2FkaW5nKSB7XG4gICAgICBsb2FkaW5nID0gYXBwZW5kRWxlbWVudChvcHRpb25zLnRlbXBsYXRlcy5sb2FkaW5nLCBvcHRpb25zLmNzcy5sb2FkaW5nLCBxdWVyeSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxvYWRpbmc7XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlTG9hZGluZygpIHtcbiAgICBpZiAobG9hZGluZykge1xuICAgICAgbGlzdC5yZW1vdmVDaGlsZChsb2FkaW5nKTtcbiAgICAgIGxvYWRpbmcgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dMb2FkTW9yZShyZXN1bHQpIHtcbiAgICBoaWRlTG9hZGluZygpO1xuXG4gICAgaWYgKCFsb2FkTW9yZSkge1xuICAgICAgbG9hZE1vcmUgPSBhcHBlbmRFbGVtZW50KG9wdGlvbnMudGVtcGxhdGVzLmxvYWRNb3JlLCBvcHRpb25zLmNzcy5sb2FkTW9yZSwgcmVzdWx0KTtcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbnMuc2hvd0xvYWRNb3JlKSB7XG4gICAgICBkb20uYWRkQ2xhc3MobG9hZE1vcmUsIG9wdGlvbnMuY3NzLmhpZGUpO1xuICAgIH1cblxuICAgIHJldHVybiBsb2FkTW9yZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhpZGVMb2FkTW9yZSgpIHtcbiAgICBpZiAobG9hZE1vcmUpIHtcbiAgICAgIGxpc3QucmVtb3ZlQ2hpbGQobG9hZE1vcmUpO1xuICAgICAgbG9hZE1vcmUgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dOb1Jlc3VsdHMocmVzdWx0KSB7XG4gICAgaGlkZUxvYWRpbmcoKTtcblxuICAgIGlmICghbG9hZE1vcmUpIHtcbiAgICAgIG5vUmVzdWx0cyA9IGFwcGVuZEVsZW1lbnQob3B0aW9ucy50ZW1wbGF0ZXMubm9SZXN1bHRzLCBvcHRpb25zLmNzcy5ub1Jlc3VsdHMsIHJlc3VsdCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGlkZU5vUmVzdWx0cygpIHtcbiAgICBpZiAobm9SZXN1bHRzKSB7XG4gICAgICBsaXN0LnJlbW92ZUNoaWxkKG5vUmVzdWx0cyk7XG4gICAgICBub1Jlc3VsdHMgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhc01vcmVJdGVtcygpIHtcbiAgICByZXR1cm4gISEobG9hZE1vcmUgfHwgbG9hZGluZyk7XG4gIH1cblxuICBmdW5jdGlvbiBhcHBlbmRFbGVtZW50KHRlbXBsYXRlLCBjbGFzc05hbWUsIG9iaikge1xuICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgICBlbGVtZW50LmlubmVySFRNTCA9IHJlbmRlcih0ZW1wbGF0ZSwgb2JqLCB0cnVlKTtcbiAgICBlbGVtZW50LmNsYXNzTmFtZSA9IGNsYXNzTmFtZSB8fCAnJztcbiAgICBsaXN0LmFwcGVuZENoaWxkKGVsZW1lbnQpO1xuXG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG11c3RhY2hlID0gcmVxdWlyZSgnbXVzdGFjaGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZW5kZXI7XG5cbnZhciBodG1sVW5lc2NhcGVzID0ge1xuICAnJmFtcDsnOiAnJicsXG4gICcmbHQ7JzogJzwnLFxuICAnJmd0Oyc6ICc+JyxcbiAgJyZxdW90Oyc6ICdcIicsXG4gICcmIzM5Oyc6ICdcXCcnLFxuICAnJiN4MkY7JzogJy8nXG59O1xudmFyIHJlSHRtbFVuZXNjYXBlcyA9IC8mKD86YW1wfGx0fGd0fHF1b3R8IzM5fCN4MkYpOy9nO1xuXG5mdW5jdGlvbiByZW5kZXIodGVtcGxhdGUsIG1vZGVsLCBlbmNvZGUpIHtcbiAgaWYgKHR5cGVvZiB0ZW1wbGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB0ZW1wbGF0ZShtb2RlbCwgZW5jb2RlKTtcbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgdGVtcGxhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKGVuY29kZSkge1xuICAgICAgcmV0dXJuIG11c3RhY2hlLnJlbmRlcih0ZW1wbGF0ZSwgbW9kZWwpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBtdXN0YWNoZS5yZW5kZXIodGVtcGxhdGUsIG1vZGVsKVxuICAgICAgICAucmVwbGFjZShyZUh0bWxVbmVzY2FwZXMsIHVuZXNjYXBlSHRtbENoYXIpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB1bmVzY2FwZUh0bWxDaGFyKGNocikge1xuICByZXR1cm4gaHRtbFVuZXNjYXBlc1tjaHJdO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbWVyZ2U6IG1lcmdlLFxuICBxdWVyeVJlZ0V4cDogcXVlcnlSZWdFeHBcbn07XG5cbmZ1bmN0aW9uIG1lcmdlKG9iajEsIG9iajIpIHtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuICB2YXIgYXR0cjtcblxuICBmb3IgKGF0dHIgaW4gb2JqMSkge1xuICAgIHJlc3VsdFthdHRyXSA9IG9iajFbYXR0cl07XG4gIH1cblxuICBmb3IgKGF0dHIgaW4gb2JqMikge1xuICAgIHJlc3VsdFthdHRyXSA9IG9iajJbYXR0cl07XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBxdWVyeVJlZ0V4cChxdWVyeSkge1xuICByZXR1cm4gbmV3IFJlZ0V4cChlc2NhcGVSZWdFeHAocXVlcnkpLCAnaWcnKTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlUmVnRXhwIChzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bLVtcXF17fSgpKis/LixcXFxcXiR8I1xcc10vZywgJ1xcXFwkJicpO1xufVxuIl19
