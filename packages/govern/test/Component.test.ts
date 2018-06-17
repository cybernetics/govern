import { combine, createElement, createObservable, Component, GovernObservable, SFC, constant, combineArray } from '../src'
import { createCounter } from './utils/createCounter'
import { createTestHarness } from './utils/createTestHarness'

describe('Component', () => {
  it("calls only componentDidMount on instantiation", () => {
    let calledDidInstantiateWith = undefined as any
    let didCallDidUpdate = false

		class TestComponent extends Component<{}> {
			render() {
			  return combine({
				  a: 1
			  })
      }
		
			componentDidMount() {
			  calledDidInstantiateWith = this.subs
			}
		
			componentDidUpdate(nextProps, nextState, nextComp) {
			  didCallDidUpdate = true
			}
    }
    
    let store = createObservable(createElement(TestComponent, null))
    expect(didCallDidUpdate).toBe(false)
    expect(calledDidInstantiateWith).toEqual({ a: 1 })
  })

  it("componentDidUpdate is called once after an update with no side effects", () => {
    let didUpdateCallCount = 0

		class TestComponent extends Component<{ updated }, { a }> {
      state = { a: 1 }

			render() {
			  return combine({
				  a: this.state.a
			  })
      }
		
			componentDidUpdate(nextProps, nextState, nextOutput) {
			  didUpdateCallCount += 1
			}
    }
    
    let harness = createTestHarness(createElement(TestComponent, { updated: false }))
    harness.changeElement(createElement(TestComponent, { updated: true }))
    expect(didUpdateCallCount).toBe(1)
    expect(harness.value).toEqual({ a: 1 })
  })
  
  it("setState within componentDidUpdate causes another componentDidUpdate", () => {
    let didUpdateCallCount = 0

		class TestComponent extends Component<{ updated }, { a }> {
      state = { a: 1 }

			render() {
        return combine({
				  a: this.state.a
			  })
      }
		
			componentDidUpdate(nextProps, nextState, nextOutput) {
        if (this.state.a === 1) {
          this.setState({ a: 2 })
        }
			  didUpdateCallCount += 1
			}
    }
    
    let harness = createTestHarness(createElement(TestComponent, { updated: false }))
    harness.changeElement(createElement(TestComponent, { updated: true }))
    expect(harness.value).toEqual({ a: 2 })
    expect(didUpdateCallCount).toBe(2)
  })

  it("children emitting values within componentDidUpdate causes another componentDidUpdate", () => {
    let didUpdateCallCount = 0
    let counter = createCounter()

		class TestComponent extends Component<{ updated }, { a }> {
      render() {
			  return combine({
          a: counter,
        })
      }
		
			componentDidUpdate(prevProps, prevState, prevSubs) {
        didUpdateCallCount += 1
        if (this.subs.a.count === 0) {
          this.subs.a.increase()
        }
			}
    }
    
    expect(didUpdateCallCount).toBe(0)
    let harness = createTestHarness(createElement(TestComponent, { updated: false }))
    harness.changeElement(createElement(TestComponent, { updated: true }))
    expect(didUpdateCallCount).toBe(2)
    expect(harness.value.a.count).toEqual(1)
  })

  it("setState within UNSAFE_componentWillReceiveProps is reflected within the output", () => {
    class TestComponent extends Component<{ updated }, { a }> {
      state = { a: 1 }

			UNSAFE_componentWillReceiveProps(nextProps) {
        this.setState({ a: 2 })
			}

			render() {
			  return combine({
				  a: this.state.a
			  })
      }
    }
    
    let updateCount = 0
    let harness = createTestHarness(createElement(TestComponent, { updated: false }), () => {
      updateCount++
    })
    harness.changeElement(createElement(TestComponent, { updated: true }))
    expect(harness.value).toEqual({ a: 2 })
  })

  it("shouldComponentUpdate can prevent updates", () => {
    class TestComponent extends Component<{ updated }> {
      shouldComponentUpdate() {
        return false
      }

      render() {
        return this.props.updated
      }
    }
    
    let updateCount = 0
    let harness = createTestHarness(createElement(TestComponent, { updated: false }), () => {
      updateCount++
    })
    expect(updateCount).toBe(0)
    harness.changeElement(createElement(TestComponent, { updated: true }))
    expect(updateCount).toBe(0)
  })

  it("shouldComponentUpdate receives new state and props", () => {
    let state, props
    let nextState, nextProps

    class TestComponent extends Component<{ updated }> {
      state = { x: 1 }

      UNSAFE_componentWillReceiveProps(nextProps) {
        this.setState({
          x: 2
        })
      }

      shouldComponentUpdate(_nextProps, _nextState) {
        state = this.state
        props = this.props
        nextState = _nextState
        nextProps = _nextProps
        return false
      }

      render() {
        return null
      }
    }
    
    let harness = createTestHarness(createElement(TestComponent, { updated: false }))
    harness.changeElement(createElement(TestComponent, { updated: true }))
    expect(state).toEqual({ x: 1 })
    expect(props).toEqual({ updated: false })
    expect(nextState).toEqual({ x: 2 })
    expect(nextProps).toEqual({ updated: true })
  })

  it("child components with shouldComponentUpdate: false still appear in the parent after setting parent props", () => {
    class TestChildComponent extends Component {
      shouldComponentUpdate(prevProps, prevState) {
        return false
      }

      render() {
        return constant("hello")
      }
    }

    class TestComponent extends Component<{ updated }> {
      render() {
        return combine({
          child: combine({
            test: createElement(TestChildComponent)
          }),
          updated: this.props.updated,
        })
      }
    }

    let harness = createTestHarness(createElement(TestComponent, { updated: false }))
    harness.changeElement(createElement(TestComponent, { updated: true }))
    expect(harness.value).toEqual({
      updated: true,
      child: {
        test: "hello"
      },
    })
  })

  it(`removing a property of a <combine /> connected child removes its value from subs`, () => {
    class Constant extends Component {
      render() {
        return constant('a')
      }
    }
    let observable = createObservable(createElement(Constant))

    class TestComponent extends Component<{ updated }> {
      render() {
        let children = { a: observable, b: observable }
        if (this.props.updated) delete children.b
        return combine(children)
      }
    }
    let harness = createTestHarness(createElement(TestComponent, { updated: false }))
    expect(harness.value).toEqual({ a: 'a', b: 'a' })
    harness.changeElement(createElement(TestComponent, { updated: true }))
    expect(harness.value).toEqual({ a: 'a' })
  })

  it("events can be received from combined <subscribe /> elements when emitted during `UNSAFE_componentWillReceiveProps` ", () => {
    let counterStore = createCounter()

    class TestComponent extends Component<{ updated }> {
      UNSAFE_componentWillReceiveProps() {
        this.subs.inner.increase()
      }

      render() {
        return combine({
          inner: counterStore
        })
      }
    }

    let harness = createTestHarness(createElement(TestComponent, { updated: false }))
    expect(harness.value.inner.count).toEqual(0)
    harness.changeElement(createElement(TestComponent, { updated: true }))
    expect(harness.value.inner.count).toEqual(1)
  })

  it("events can be received from combined stores in the same transaction as a setState", () => {
    let counterStore = createCounter()

    class TestComponent extends Component<{ updated }> {
      render() {
        return combine({
          child: counterStore,
          update: () => {
            this.setState({})
            this.subs.child.increase()
          }
        })
      }
    }

    let harness = createTestHarness(createElement(TestComponent))
    harness.dispatch(() => {
      harness.value.update()
    })
    expect(harness.value.child.count).toEqual(1)
  })

  it("calls getDerivedStateFromProps on instantiation", () => {
    class TestComponent extends Component<{ hello }, any> {
      state = {} as any

      static getDerivedStateFromProps(props: { hello }, prevState) {
        return props.hello ? { hello: 'world' } : {}
      }

      render() {
        return constant(this.state.hello)
      }
    }

    let harness = createTestHarness(createElement(TestComponent, { hello: 'derive' }))
    expect(harness.value).toBe('world')
  })

  it("calls getDerivedStateFromProps on update", () => {
    class TestComponent extends Component<{ updated }, any> {
      state = {} as any

      static getDerivedStateFromProps(props: { updated }, prevState) {
        return props.updated ? { hello: 'world' } : {}
      }

      render() {
        return constant(this.state.hello)
      }
    }

    let harness = createTestHarness(createElement(TestComponent, { updated: false }))
    expect(harness.value).toBe(undefined)
    harness.changeElement(createElement(TestComponent, { updated: true }))
    expect(harness.value).toBe('world')
  })

  it("can subscribe to nested stores", () => {
    let counterStore = createCounter()

    class TestComponent extends Component<{ updated }, any> {
      state = {} as any

      render() {
        return combine({
          outer: combine({
            inner: counterStore
          })
        })
      }
    }

    let harness = createTestHarness(createElement(TestComponent))
    expect(harness.value.outer.inner.count).toBe(0)
    harness.dispatch(() => {
      harness.value.outer.inner.increase()
    })
    expect(harness.value.outer.inner.count).toBe(1)
  })

  it("can subscribe to arrays of stores", () => {
    let counter1Store = createCounter()
    let counter2Store = createCounter()

    class TestComponent extends Component<{ updated }, any> {
      state = {} as any

      render() {
        return combineArray([
          counter1Store,
          counter2Store,
        ])
      }
    }

    let harness = createTestHarness(createElement(TestComponent))
    expect(harness.value[0].count).toBe(0)
    harness.dispatch(() => {
      harness.value[0].increase()
    })
    expect(harness.value[0].count).toBe(1)
    expect(harness.value[1].count).toBe(0)
  })

  // it("can call actions on parents during disposal", () => {

  // })
})
