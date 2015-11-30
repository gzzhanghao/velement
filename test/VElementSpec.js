import VElement from '../src/VElement'

let e = VElement.e

describe('VElement', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
    container.innerHTML = '<span></span>'
  })

  function createDOM(opts) {
    return new VElement(opts).replace(container.firstChild).update()
  }

  it('can append to an element', () => {
    new VElement(e('div', {}, {})).appendTo(container)
    expect(container.lastChild).toEqual(jasmine.any(HTMLDivElement))
  })

  it('can insert before an element', () => {
    new VElement(e('div', {}, {})).insertBefore(container.firstChild)
    expect(container.firstChild).toEqual(jasmine.any(HTMLDivElement))
  })

  it('can replace an element', () => {
    new VElement(e('div', {}, {})).replace(container.firstChild)
    expect(container.firstChild).toEqual(jasmine.any(HTMLDivElement))
    expect(container.children.length).toEqual(1)
  })

  it('can create an element with namespace', () => {
    createDOM(e('svg', {}, {}, null, null, 'http://www.w3.org/2000/svg'))
    expect(container.firstChild).toEqual(jasmine.any(SVGElement))
    expect(container.firstChild.namespaceURI).toEqual('http://www.w3.org/2000/svg')
  })

  it('can create an element with layout', () => {
    createDOM(e('div', { top: 1, left: 2, width: 3, height: 4 }))
    let style = container.firstChild.style
    expect(style.transform).toEqual('translate(2px, 1px)')
    expect(style.width).toEqual('3px')
    expect(style.height).toEqual('4px')
  })

  it('can create an element with dynamic layout', () => {
    let width = 1
    let virtual = createDOM(e('div', { width: () => width }))
    let style = container.firstChild.style
    expect(style.width).toEqual('1px')
    width = 2
    virtual.update()
    expect(style.width).toEqual('2px')
  })

  it('can update opts with update method', () => {
    let virtual = createDOM(e('div', { width: 1 }, {}))
    let style = container.firstChild.style
    expect(style.width).toEqual('1px')
    virtual.update(e('div', { width: 2 }, {}))
    expect(style.width).toEqual('2px')
  })

  it('can create an element with properties', () => {
    let virtual = createDOM(e('div', {}, { background: { color: 'red' } }))
    let style = container.firstChild.style
    expect(style.background).toEqual('red')
    virtual.update(e('div', {}, { background: { color: 'blue' } }))
    expect(style.background).toEqual('blue')
  })

  it('can create element with text children', () => {
    let virtual = createDOM(e('div', {}, {}, 0))
    expect(container.firstChild.textContent).toEqual('0')
    virtual.update(e('div', {}, {}, 1))
    expect(container.firstChild.textContent).toEqual('1')
  })

  it('can create element with element children', () => {
    let virtual = createDOM(
      e('div', {}, {}, [e('span')])
    )
    expect(container.firstChild.children.length).toEqual(1)
    expect(container.firstChild.children[0]).toEqual(jasmine.any(HTMLSpanElement))
  })

  it('can create element with dynamic children', () => {
    let virtual = createDOM(e('div', {}, {}, [[]]))
    expect(container.firstChild.children.length).toEqual(0)
    virtual.update(
      e('div', {}, {}, [
        [e('span')]
      ])
    )
    expect(container.firstChild.children.length).toEqual(1)
    expect(container.firstChild.children[0]).toEqual(jasmine.any(HTMLSpanElement))
  })

  it('can create element with children from functions', () => {
    let elements = []
    let virtual = createDOM(
      e('div', {}, {}, [
        () => elements.map(element => (
          e('span', {}, {}, element)
        ))
      ])
    )
    expect(container.firstChild.children.length).toEqual(0)
    elements = [1, 2]
    virtual.update()
    expect(container.firstChild.children.length).toEqual(2)
    expect(container.firstChild.children[0]).toEqual(jasmine.any(HTMLSpanElement))
    expect(container.firstChild.children[1]).toEqual(jasmine.any(HTMLSpanElement))
  })

  it('can get layout of the element', () => {
    createDOM(e('div', { top: 1, width: $ => $.top() + 1 }, $ => ({ className: `element-${$.top()}` })))
    expect(container.firstChild.classList.contains('element-1')).toEqual(true)
    expect(container.firstChild.style.width).toEqual('2px')
  })

  it('can get layout of other elements', () => {
    createDOM(
      e('div', { top: 1, width: 2, height: $ => $.children[0].bottom() + 1 }, {}, [
        e('span', { top: 1, width: $ => $.parent.width() - 1, height: 1 })
      ])
    )
    expect(container.firstChild.style.height).toEqual('3px')
    expect(container.firstChild.firstChild.style.width).toEqual('1px')
  })
})