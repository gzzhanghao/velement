import VList from './VList';
import * as util from './util';

var {on, assign, isUndefined, isFunction, isArray, isValidNum, isString} = util;

function VElement(props) {
  var self = this;

  self.props = props;
  self.state = { attr: {}, style: {}, children: [] };

  props.layout = props.layout || {};

  self.element = document.createElement(props.name);
  self.style = self.element.style;
  self.elements = [self];

  var children = props.children;

  if (isUndefined(children)) {
    return;
  }

  if (!isArray(children)) {
    if (isFunction(children)) {
      children = children();
    }
    self.children = self.state.children = self.element.innerHTML = children + '';
    return;
  }

  children = self.state.children = children.map(child => {
    if (isFunction(child)) {
      child = new VList;
    } else {
      child = new VElement(child);
    }
    self.element.appendChild(child.element);
    child.parent = self;
    return child;
  });
}

[['top', 'height', 'bottom'], ['left', 'width', 'right']].forEach(([top, height, bottom]) => {
  assign(VElement.prototype, {

    [top]() {
      var nextState = this.nextState.layout;
      if (isUndefined(nextState[top])) {
        var value = this.calc(this.props.layout[top]);
        if (!isValidNum(value)) {
          value = 0;
        }
        nextState[top] = value;
      }
      return nextState[top];
    },

    [height](optional) {
      var nextState = this.nextState.layout;
      if (isUndefined(nextState[height])) {
        var value = this.calc(this.props.layout[height]);
        if (!isValidNum(value) && !optional) {
          value = this.getBCR()[height];
        }
        nextState[height] = value;
      }
      return nextState[height];
    },

    [bottom]() {
      var nextState = this.nextState.layout;
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
    return this;
  },

  insertBefore(sibling) {
    sibling.parentNode.insertBefore(this.element, sibling);
    return this;
  },

  replace(landmark) {
    landmark.parentNode.replaceChild(this.element, landmark);
    return this;
  },

  update(props) {
    var i, j, keys, oriKeys, node, state, nextState, value, children;
    var nodes = [this];

    this.props = props || this.props;

    // Update DOM structure
    for (i = 0; i < nodes.length; i++) {
      node = nodes[i];

      node.nextState = { attr: {}, style: {}, layout: {} };

      state = node.state.children;
      children = node.props.children;

      if (isUndefined(children)) {
        continue;
      }

      if (!isArray(children)) {
        if (isFunction(children)) {
          children = children();
        }
        children += '';
        if (state !== children) {
          node.children = node.state.children = node.element.innerHTML = children;
        }
        continue;
      }

      for (j = children.length - 1; j >= 0; j--) {
        if (isFunction(children[j])) {
          state[j].update(children[j]);
        } else {
          state[j].props = children[j];
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

    // Apply transformations and update attributes
    for (i = nodes.length - 1; i >= 0; i--) {
      node = nodes[i];

      nextState = node.nextState;

      value = node.calc(node.props.trans);
      keys = Object.keys(value);
      for (j = keys.length - 1; j >= 0; j--) {
        VElement.transforms[keys[j]](value[keys[j]], nextState.style, nextState.attr);
      }
      VElement.transforms.layout({
        top: node.top(), left: node.left(),
        width: node.width(true), height: node.height(true)
      }, nextState.style, nextState.attr);

      state = node.state.attr;
      nextState = nextState.attr;

      oriKeys = Object.keys(state);
      keys = Object.keys(nextState);

      for (j = oriKeys.length - 1; j >= 0; j--) {
        if (keys.indexOf(oriKeys[j]) < 0) {
          node.element.removeAttribute(oriKeys[j]);
          node.bcr = null;
        }
      }

      for (j = keys.length - 1; j >= 0; j--) {
        if (state[keys[j]] !== nextState[keys[j]] + '') {
          node.element.setAttribute(keys[j], state[keys[j]] = nextState[keys[j]] + '');
          node.bcr = null;
        }
      }
    }

    nodes = [this];

    // Update style
    for (i = 0; i < nodes.length; i++) {
      node = nodes[i];

      state = node.state.style;
      nextState = node.nextState.style;

      if (nextState.display === 'none') {
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

      oriKeys = Object.keys(state);
      keys = Object.keys(nextState);

      for (j = oriKeys.length - 1; j >= 0; j--) {
        if (keys.indexOf(oriKeys[j]) < 0) {
          node.style[oriKeys[j]] = '';
          node.bcr = null;
        }
      }

      for (j = keys.length - 1; j >= 0; j--) {
        if (state[keys[j]] !== nextState[keys[j]] + '') {
          node.style[keys[j]] = state[keys[j]] = nextState[keys[j]] + '';
          node.bcr = null;
        }
      }

      if (isArray(node.children)) {
        nodes = nodes.concat(node.children);
      }
    }
  },

  calc(value) {
    if (isFunction(value)) {
      value = value.call(this, this);
    }
    return value;
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

VElement.e = function(name, layout, trans, children, key = void 0) {
  return { name, layout, trans, children, key };
};

VElement.transforms = {

  layout(config, style) {
    style.position = style.position || 'absolute';
    style.top = style.left = 0;
    style.transform = `translate(${config.left}px, ${config.top}px) ${style.transform || ''}`;
    if (!isUndefined(config.width)) {
      style.width = config.width + 'px';
    }
    if (!isUndefined(config.height)) {
      style.height = config.height + 'px';
    }
  },

  background(config, style) {
    style.background = config;
  },

  display(config, style) {
    if (config === false) {
      style.display = 'none';
    }
  },

  className(config, style, attr) {
    if (isArray(config)) {
      config = config.join(' ');
    }
    attr.class = config;
  }
};

export default VElement;
