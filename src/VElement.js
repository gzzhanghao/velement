import assign from 'object-assign';
import VList from './VList';
import {isUndefined, isFunction, isArray} from './util';

var propGetter = {
	attr(self, key) { return self.element.getAttribute(key) },
	style(self, key) { return self.element.style[key] || self.getComputedStyle()[key] },
	prop(self, prop) {
		switch (prop) {
			case 'top': case 'bottom': case 'left': case 'right':
				return self.getBCR()[prop];
			case 'height':
				return self.getBCR().bottom - self.getBCR().top;
			case 'width':
				return self.getBCR().right - self.getBCR().left;
			case 'show':
				return false;
		}
	}
};

function VElement (properties, trace) {
	var self = this;

	self.setProperties(properties);
	properties = self.properties;
	self.key = properties.prop.key;
	self.state = { attr: {}, prop: {}, style: {}, children: [] };
	self.nextState = { attr: {}, prop: {}, style: {} };

	if (properties.namespace) {
		self.element = document.createElementNS(properties.namespace, properties.name);
	} else {
		self.element = document.createElement(properties.name);
	}

	self.elements = [self];

	var children = properties.children;

	if (!isArray(children)) {
		self.state.children = self.element.innerHTML = children;
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

['attr', 'style'].forEach(property => {
	VElement.prototype[property] = function (key) {
		if (!isUndefined(this.properties[property][key])) {
			return this.getProperty(property, key);
		}
		var state = this.state[property];
		if (isUndefined(state[key])) {
			state[key] = propGetter[property](this, key);
		}
		return state[key];
	};
});

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
	update(properties) {
		var i, j;
		var keys, node, nextState, state, value, children;
		var nodes = [this];

		if (properties) {
			this.setProperties(properties);
		}

		for (i = 0; i < nodes.length; i++) {
			node = nodes[i];
			state = node.state.children;
			children = node.properties.children;
			if (!isArray(children)) {
				if (isFunction(children)) {
					children = children();
				}
				if (state !== children) {
					node.children = node.state.children = node.element.innerHTML = '' + children;
				}
				continue;
			}
			for (j = state.length - 1; j >= 0; j--) {
				if (state[j] instanceof VList) {
					state[j].construct(children[j]);
				} else {
					state[j].setProperties(children[j]);
				}
				nodes = nodes.concat(state[j].elements);
			}
		}

		for (i = nodes.length - 1; i >= 0; i--) {
			if (isArray(nodes[i].properties.children)) {
				children = nodes[i].children = nodes[i].state.children.reduce((a, b) => a.concat(b.elements), []);
				for (j = children.length - 1; j >= 0; j--) {
					children[j].prev = children[j - 1];
					children[j].next = children[j + 1];
					children[j].parent = nodes[i];
				}
			}
		}

		for (i = nodes.length - 1; i >= 0; i--) {
			node = nodes[i];

			keys = Object.keys(node.properties.attr);
			for (j = keys.length - 1; j >= 0; j--) {
				value = node.getProperty('attr', keys[j]);
				if (value === false) {
					node.element.removeAttribute(keys[j]);
				} else {
					node.element.setAttribute(keys[j], value);
				}
			}

			keys = Object.keys(node.properties.style);
			for (j = keys.length - 1; j >= 0; j--) {
				node.getProperty('style', keys[j]);
			}

			nextState = node.nextState.style;
			state = node.state.style;

			if (nextState.display === 'none' || node.getProperty('prop', 'show') === false) {
				if (state.display !== 'none') {
					node.element.style.display = state.display = 'none';
				}
				continue;
			}

			nextState.display = nextState.display || 'block';
			nextState.position = 'absolute';
			nextState.top = nextState.left = 0;

			nextState.transform = `translate(${node.left()}px, ${node.top()}px) ${nextState.transform || ''}`;
			value = node.width(true);
			if (!isUndefined(value)) {
				nextState.width = `${value}px`;
			}
			value = node.height(true);
			if (!isUndefined(value)) {
				nextState.height = `${node.height(true)}px`;
			}

			keys = Object.keys(nextState);
			for (j = keys.length - 1; j >= 0; j--) {
				if (state[keys[j]] !== nextState[keys[j]]) {
					node.element.style[keys[j]] = state[keys[j]] = nextState[keys[j]];
				}
			}
		}

		for (i = nodes.length - 1; i >= 0; i--) {
			nodes[i].nextState = { attr: {}, prop: {}, style: {} };
		}
	},
	getProperty(property, key) {
		var nextState = this.nextState[property];
		if (isUndefined(nextState[key])) {
			var value = this.properties[property][key];
			if (isFunction(value)) {
				nextState[key] = this.state[property][key];
				if (isUndefined(nextState[key])) {
					nextState[key] = propGetter[property](this, key);
				}
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
		if (!this.bcr) {
			this.bcr = this.element.getBoundingClientRect();
		}
		return this.bcr;
	},
	getComputedStyle() {
		if (!this.computedStyle) {
			this.computedStyle = getComputedStyle(this.element);
		}
		return this.computedStyle;
	},
	setProperties(properties) {
		this.properties = assign({ attr: {}, prop: {}, style: {}, children: '' }, properties);
	}
});

export default VElement;
