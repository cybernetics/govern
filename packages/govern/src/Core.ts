import { GovernElement } from './GovernElement'
import { GovernableClass } from './GovernObservableGovernor'
import { GovernObservable } from './GovernObservable'

export type BuiltInType = 'combine' | 'constant' | 'distinct' | 'flatMap' | 'map' | 'subscribe'
export type ComponentType<Value, Props> = GovernableClass<Value, Props> | StatelessComponent<Value, Props>;
export type GovernType<Value = any, Props = any> = BuiltInType | ComponentType<Value, Props>;
export type Subscribable<Value> = GovernElement<Value> | GovernObservable<Value>

type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never;
export type StoreValue<S extends GovernObservable<any>> = ReturnOf<S["getValue"]>
export type ElementValue<E extends GovernElement<any>> = E["value"]

export type Renderable<X> = GovernElement<X> | GovernObservable<X> | X

export type Snapshot<X> =
    X extends GovernElement<infer T> ? T :
    X extends GovernObservable<infer T> ? T :
    X extends ComponentClass<infer T> ? T :
    X extends SFC<infer T, any> ? T :
    never

export type Value<X extends Subscribable<any>> =
    X extends GovernElement<infer T> ? T :
    X extends GovernObservable<infer T> ? T :
    never

export type ValueOf<X extends ComponentType<any, any>> =
    X extends ComponentType<infer T, any> ? T : never


type ComponentClass<Value> =
    (new (props: any) => {
        render(): GovernElement<Value> | Value;
    })

export type StoreOf<X extends ComponentClass<any> | StatelessComponent<any, any> | GovernElement<any, any>> =
    GovernObservable<
        X extends ComponentClass<infer T> ? T :
        X extends StatelessComponent<infer T, any> ? T :
        X extends GovernElement<infer T, any> ? T :
        never
    >

export type Key = string | number;

export interface Attributes {
    key?: Key;
}

export type ComponentState = {};

export type MapProps<FromValue, ToValue> = {
    from: Subscribable<FromValue>,
    to: (props: FromValue) => ToValue
}

export type FlatMapProps<FromValue, ToValue> = {
    from: Subscribable<FromValue>,
    to: (props: FromValue) => Subscribable<ToValue>
}

export type ConstantProps<Value> = {
    of: Value,
}

export type DistinctProps<Value> = {
    // Defaults to reference equality
    by?: (x: Value, y: Value) => boolean,

    children: Subscribable<Value> | Value
}

export type SubscribeProps<Value> = {
    to: GovernObservable<Value>,
}

export type SFC<Value, Props> = StatelessComponent<Value, Props>;
export interface StatelessComponent<Value, Props> {
    (props: Props): Renderable<Value>;
    defaultProps?: Partial<Props>;
    displayName?: string;
}

export type CombinedValue<Children extends { [name: string]: any }> =
    {
        [K in keyof Children]:
        Children[K] extends Subscribable<infer SubscribableSnapshot> ? SubscribableSnapshot :
        Children[K] extends GovernObservable<infer ObservableSnapshot> ? ObservableSnapshot :
        Children[K] extends GovernElement<infer ElementSnapshot> ? ElementSnapshot :
        Children[K]
    }