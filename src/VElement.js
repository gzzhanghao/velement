import VList from './VList';
import * as util from './util';

var {on, assign, isUndefined, isFunction, isArray} = util;

function VElement(properties) {
  var self = this;

  self.properties = properties;
  self.key = properties.key;
  self.state = { attr: {}, prop: {}, style: {}, children: [] };
  self.nextState = { attr: {}, prop: {}, style: {} };
  self.data = properties.data || {};

  self.element = document.createElement(properties.name);

  // @todo dynamic binding event handler

  var events = Object.keys(properties.event);
  for (var i = events.length - 1; i >= 0; i--) {
    on(self.element, events[i], properties.event[events[i]].bind(self, self));
  }

  self.style = self.element.style;
  self.elements = [self];

  var children = properties.children;

  if (!isArray(children)) {
    self.children = self.state.children = self.element.innerHTML = children + '';
    return;
  }

  children = self.state.children = children.map(child => {
    if (isFunction(child)) {
      child = new VList();
    } else {
      child = new VElement(child);
    }
    child.parent = self;
    self.element.appendChild(child.element);
    return child;
  });
}

[['top', 'height', 'bottom'], ['left', 'width', 'right']].forEach(([top, height, bottom]) => {
  assign(VElement.prototype, {

    [top]() {
      var nextState = this.nextState.prop;
      if (isUndefined(nextState[top])) {
        if (!isUndefined(this.properties.prop[top])) {
          nextState[top] = this.getProperty('prop', top);
        } else {
          nextState[top] = 0;
        }
      }
      return nextState[top];
    },

    [height](optional) {
      var nextState = this.nextState.prop;
      if (isUndefined(nextState[height])) {
        if (!isUndefined(this.properties.prop[height])) {
          nextState[height] = this.getProperty('prop', height);
        } else if (!optional) {
          var bcr = this.getBCR();
          nextState[height] = bcr[bottom] - bcr[top];
        }
      }
      return nextState[height];
    },

    [bottom]() {
      var nextState = this.nextState.prop;
      if (isUndefined(nextState[bottom])) {
        nextState[bottom] = this[top]() + this[height]();
      }
      return nextState[bottom];
    }
  });
});

assign(VElement.prototype, {

  appendTo(parent) {
    parent.appendChild(this.element);
  },

  insertBefore(sibling) {
    sibling.parentNode.insertBefore(this.element, sibling);
  },

  attr(key) {
    if (!isUndefined(this.properties.attr[key])) {
      return this.getProperty('attr', key);
    }
    var state = this.state.attr;
    if (isUndefined(state[key])) {
      state[key] = this.element.getAttribute(key);
    }
    return state[key];
  },

  update(properties) {
    var nodes = [this];
    var updateNodes = [this];
    var i, j, keys, node, nextState, state, value, children;

    if (properties) {
      this.properties = properties;
    }

    // Update DOM structure
    for (i = 0; i < nodes.length; i++) {
      node = nodes[i];
      state = node.state.children;
      children = node.properties.children;

      if (isUndefined(children)) {
        continue;
      }
      if (!isArray(children)) {
        children += '';
        if (state !== children) {
          node.children = node.state.children = node.element.innerHTML = children;
        }
        continue;
      }
      for (j = state.length - 1; j >= 0; j--) {
        if (state[j] instanceof VList) {
          state[j].update(children[j]);
        } else {
          state[j].properties = children[j];
        }
        nodes = nodes.concat(state[j].elements);
      }
      children = nodes[i].children = state.reduce((a, b) => a.concat(b.elements), []);
      for (j = children.length - 1; j >= 0; j--) {
        children[j].prev = children[j - 1];
        children[j].next = children[j + 1];
        children[j].parent = nodes[i];
      }
    }

    // Update attributes
    for (i = nodes.length - 1; i >= 0; i--) {
      node = nodes[i];
      state = node.state.attr;
      keys = Object.keys(node.properties.attr);
      for (j = keys.length - 1; j >= 0; j--) {
        value = node.getProperty('attr', keys[j]);
        if (value !== false) {
          value += '';
          if (value !== state[keys[j]]) {
            node.element.setAttribute(keys[j], value);
            node.bcr = null;
          }
        } else if (state[keys[j]] === false) {
          node.element.removeAttribute(keys[j]);
          node.bcr = null;
        }
        state[keys[j]] = value;
      }
    }

    // Update style
    for (i = 0; i < updateNodes.length; i++) {
      node = updateNodes[i];

      keys = Object.keys(node.properties.style);
      for (j = keys.length - 1; j >= 0; j--) {
        node.getProperty('style', keys[j]);
      }

      nextState = node.nextState.style;
      state = node.state.style;

      if (nextState.display === 'none' || node.getProperty('prop', 'show') === false) {
        if (state.display !== 'none') {
          node.style.display = state.display = 'none';
          children = [node];
          for (j = 0; j < children.length; j++) {
            children[j].bcr = { top: 0, right: 0, left: 0, bottom: 0, width: 0, height: 0 };
            if (isArray(children[j].children)) {
              children = children.concat(children[j].children);
            }
          }
        }
        continue;
      }

      nextState.display = nextState.display || 'block';
      nextState.position = 'absolute';
      nextState.top = nextState.left = 0;
      nextState.transform = `translate(${node.left() | 0}px, ${node.top() | 0}px) ${nextState.transform || ''}`;

      value = node.width(true);
      if (!isUndefined(value)) {
        nextState.width = `${value | 0}px`;
      }
      value = node.height(true);
      if (!isUndefined(value)) {
        nextState.height = `${value | 0}px`;
      }

      keys = Object.keys(nextState);
      for (j = keys.length - 1; j >= 0; j--) {
        if (state[keys[j]] !== nextState[keys[j]] + '') {
          node.style[keys[j]] = state[keys[j]] = nextState[keys[j]] + '';
          node.bcr = null;
        }
      }

      if (isArray(node.children)) {
        updateNodes = updateNodes.concat(node.children);
      }
    }

    // Clean up state
    for (i = nodes.length - 1; i >= 0; i--) {
      nodes[i].nextState = { attr: {}, prop: {}, style: {} };
    }
  },

  getProperty(property, key) {
    var nextState = this.nextState[property];
    if (isUndefined(nextState[key])) {
      var value = this.properties[property][key];
      if (isFunction(value)) {
        value = value.call(this, this);
      }
      if (isUndefined(value)) {
        value = null;
      }
      nextState[key] = value;
    }
    return nextState[key];
  },

  getBCR() {
    var bcr = this.bcr;
    if (!bcr) {
      bcr = this.element.getBoundingClientRect();
      this.bcr = { width: bcr.right - bcr.left, height: bcr.bottom - bcr.top, top: bcr.top, right: bcr.right, left: bcr.left, bottom: bcr.bottom };
    }
    return this.bcr;
  }
});

export default VElement;
