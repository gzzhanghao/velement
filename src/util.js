export function $(selector, context) {
  return (context || document).querySelector(selector);
}

export function $$(selector, context) {
  return [].slice.call((context || document).querySelectorAll(selector));
}

export function on(element, event, handler) {
  return element.addEventListener(event, handler);
}

export function off(element, event, handler) {
  return element.removeEventListener(event, handler);
}

export function isFunction(value) {
  return typeof value === 'function';
}

export function isUndefined(value) {
  return typeof value === 'undefined';
}

export function isArray(value) {
  return value instanceof Array;
}

export function isValidNum(value) {
  return typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value);
}

export function assign(base) {
  var i, ii, j, source, keys;
  for (i = 1, ii = arguments.length; i < ii; i++) {
    source = arguments[i];
    keys = Object.keys(source);
    for (j = keys.length - 1; j >= 0; j--) {
      base[keys[j]] = source[keys[j]];
    }
  }
  return base;
}
