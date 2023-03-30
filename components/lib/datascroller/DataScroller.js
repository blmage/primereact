import * as React from 'react';
import { localeOption } from '../api/Api';
import { useMountEffect, useUnmountEffect, useUpdateEffect } from '../hooks/Hooks';
import { classNames, DomHandler, ObjectUtils } from '../utils/Utils';
import { isPlainObject } from 'is-plain-object';
import { DataScrollerBase } from './DataScrollerBase';

export const DataScroller = React.memo(
    React.forwardRef((inProps, ref) => {
        const props = DataScrollerBase.getProps(inProps);

        const [, setDataToRenderState] = React.useState([]);
        const elementRef = React.useRef(null);
        const contentRef = React.useRef(null);
        const scrollableContentRef = React.useRef(null);
        const value = React.useRef(props.value);
        const dataToRender = React.useRef([]);
        const first = React.useRef(0);
        const scrollFunction = React.useRef(null);
        const { lazy, onLazyLoad, rows, value: baseValue } = props;

        const load = React.useCallback(() => {
            if (lazy) {
                if (onLazyLoad) {
                    onLazyLoad({
                        rows,
                        first: first.current
                    });
                }

                first.current += rows;
            } else {
                if (value.current) {
                    for (let i = first.current; i < first.current + rows; i++) {
                        if (i >= value.current.length) {
                            break;
                        }

                        dataToRender.current.push(value.current[i]);
                    }

                    if (value.current.length !== 0) {
                        first.current += rows;
                    }

                    setDataToRenderState(dataToRender.current);
                }
            }
        }, [lazy, onLazyLoad, rows, first, value, dataToRender, setDataToRenderState]);

        const reset = () => {
            first.current = 0;
            dataToRender.current = [];
            setDataToRenderState(dataToRender.current);
            load();
        };

        const bindScrollListener = () => {
            if (props.inline) {
                scrollableContentRef.current = DomHandler.getScrollableParents(contentRef.current.firstElement || contentRef.current)[0];

                scrollFunction.current = () => {
                    let scrollTop = scrollableContentRef.current.scrollTop,
                        scrollHeight = scrollableContentRef.current.scrollHeight,
                        viewportHeight = scrollableContentRef.current.clientHeight;

                    if (scrollTop >= scrollHeight * props.buffer - viewportHeight) {
                        load();
                    }
                };

                scrollableContentRef.current.addEventListener('scroll', scrollFunction.current);
            } else {
                scrollFunction.current = () => {
                    let docBody = document.body,
                        docElement = document.documentElement,
                        scrollTop = window.pageYOffset || document.documentElement.scrollTop,
                        winHeight = docElement.clientHeight,
                        docHeight = Math.max(docBody.scrollHeight, docBody.offsetHeight, winHeight, docElement.scrollHeight, docElement.offsetHeight);

                    if (scrollTop >= docHeight * props.buffer - winHeight) {
                        load();
                    }
                };

                window.addEventListener('scroll', scrollFunction.current);
            }
        };

        const unbindScrollListener = () => {
            if (scrollFunction.current) {
                if (props.inline && scrollableContentRef.current) {
                    scrollableContentRef.current.removeEventListener('scroll', scrollFunction.current);
                } else if (!props.loader) {
                    window.removeEventListener('scroll', scrollFunction.current);
                }
            }

            scrollFunction.current = null;
        };

        useMountEffect(() => {
            load();

            if (!props.loader) {
                bindScrollListener();
            }
        });

        React.useMemo(() => {
            if (baseValue) {
                if (Array.isArray(baseValue)) {
                    value.current = baseValue;
                } else if (baseValue instanceof Map) {
                    value.current = Array.from(baseValue.values());
                } else if (isPlainObject(baseValue)) {
                    value.current = Object.values(baseValue);
                }

                if (!lazy) {
                    first.current = 0;
                }

                dataToRender.current = [];

                if (lazy) {
                    dataToRender.current = value.current;
                    setDataToRenderState(dataToRender.current);
                } else {
                    load();
                }
            }
        }, [lazy, baseValue, value, first, dataToRender, setDataToRenderState, load]);

        useUpdateEffect(() => {
            if (props.loader) {
                unbindScrollListener();
            }
        }, [props.loader]);

        useUnmountEffect(() => {
            if (scrollFunction.current) {
                unbindScrollListener();
            }
        });

        React.useImperativeHandle(ref, () => ({
            props,
            load,
            reset,
            getElement: () => elementRef.current,
            getContent: () => contentRef.current
        }));

        const createHeader = () => {
            if (props.header) {
                return <div className="p-datascroller-header">{props.header}</div>;
            }

            return null;
        };

        const createFooter = () => {
            if (props.footer) {
                return <div className="p-datascroller-footer">{props.footer}</div>;
            }

            return null;
        };

        const createItem = (_value, index) => {
            const content = props.itemTemplate ? props.itemTemplate(_value) : _value;

            return <li key={index + '_datascrollitem'}>{content}</li>;
        };

        const createEmptyMessage = () => {
            const content = ObjectUtils.getJSXElement(props.emptyMessage, props) || localeOption('emptyMessage');

            return <li>{content}</li>;
        };

        const createContent = () => {
            const content = ObjectUtils.isNotEmpty(dataToRender.current) ? dataToRender.current.map(createItem) : createEmptyMessage();

            return (
                <div ref={contentRef} className="p-datascroller-content" style={{ maxHeight: props.scrollHeight }}>
                    <ul className="p-datascroller-list">{content}</ul>
                </div>
            );
        };

        const otherProps = DataScrollerBase.getOtherProps(props);
        const className = classNames('p-datascroller p-component', props.className, {
            'p-datascroller-inline': props.inline
        });

        const header = createHeader();
        const footer = createFooter();
        const content = createContent();

        return (
            <div id={props.id} ref={elementRef} className={className} {...otherProps}>
                {header}
                {content}
                {footer}
            </div>
        );
    })
);

DataScroller.displayName = 'DataScroller';
