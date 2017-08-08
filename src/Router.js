/**
 * Copyright (c) 2015-present, Pavel Aksonov
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import React, {
  Component,
  PropTypes,
} from 'react';
import { BackAndroid } from 'react-native';
import NavigationExperimental from 'react-native-experimental-navigation';

import Actions, { ActionMap } from './Actions';
import getInitialState from './State';
import Reducer, { findElement } from './Reducer';
import DefaultRenderer from './DefaultRenderer';
import Scene from './Scene';
import * as ActionConst from './ActionConst';

const {
  RootContainer: NavigationRootContainer,
} = NavigationExperimental;

const propTypes = {
  dispatch: PropTypes.func,
  backAndroidHandler: PropTypes.func,
  onBackAndroid: PropTypes.func,
  onExitApp: PropTypes.func,
};

class Router extends Component {
  static childContextTypes = {
    routes: PropTypes.object,
  }

  constructor(props) {
    super(props);
    this.renderNavigation = this.renderNavigation.bind(this);
    this.handleProps = this.handleProps.bind(this);
    this.handleBackAndroid = this.handleBackAndroid.bind(this);
    const reducer = this.handleProps(props);
    this.state = { reducer };
  }

  getChildContext() {
    return {
      routes: Actions,
    };
  }

  componentDidMount() {
    BackAndroid.addEventListener('hardwareBackPress', this.handleBackAndroid);
  }

  componentWillReceiveProps(props) {
    const reducer = this.handleProps(props);
    this.setState({ reducer });
  }

  componentWillUnmount() {
    BackAndroid.removeEventListener('hardwareBackPress', this.handleBackAndroid);
  }

  handleBackAndroid() {
    const {
      backAndroidHandler,
      onBackAndroid,
      onExitApp,
    } = this.props;
    // optional for customizing handler
    if (backAndroidHandler) {
      return backAndroidHandler();
    }

    try {
      Actions.pop();
      if (onBackAndroid) {
        onBackAndroid();
      }
      return true;
    } catch (err) {
      if (onExitApp) {
        return onExitApp();
      }

      return false;
    }
  }

  /**
   *
   * @param props
   * @returns 将会传给ExpNav的reducer函数
   */
  handleProps(props) {
    let scenesMap;

    if (props.scenes) {
      scenesMap = props.scenes;
    } else {
      let scenes = props.children;

      if (Array.isArray(props.children) || props.children.props.component) {
        scenes = (
          <Scene
            key="__root"
            hideNav
            {...this.props}
          >
            {props.children}
          </Scene>
        );
      }
      scenesMap = Actions.create(scenes, props.wrapBy);
    }

    // eslint-disable-next-line no-unused-vars
    const { children, styles, scenes, reducer, createReducer, ...parentProps } = props;

    scenesMap.rootProps = parentProps;

    const initialState = getInitialState(scenesMap);

    // @ERIC createReducer, reducer实际上都是可以自定义的，也就是router变化这种，放到这里处理应该会更科学，直接感知所有Navgation里面的变动
    const reducerCreator = props.createReducer || Reducer;

    const routerReducer = props.reducer || (
      reducerCreator({
        initialState,
        scenes: scenesMap,
      }));

    return routerReducer;
  }

  /**
   *
   * @ERIC 在NavigationRootContainer里面render方法中调用它
   * @param navigationState this.state.navState from NavigationRootContainer
   * @param onNavigate this.handleNavigation from NavigationRootContainer
   * @returns {*}
   */
  renderNavigation(navigationState, onNavigate) {
    if (!navigationState) {
      return null;
    }
    Actions.get = key => findElement(navigationState, key, ActionConst.REFRESH);

    // @ERIC 调用Actions的方法以后都会调用这个回调，这里主要处理和ExperimentalNavigator的交互
    // 表层的跳转API由 flux-router封装，状态的变化告知ExpNav, ExpNav中通过外部传入的reducer改变状态
    Actions.callback = props => {
      const constAction = (props.type && ActionMap[props.type] ? ActionMap[props.type] : null);
      if (this.props.dispatch) {
        if (constAction) {
          this.props.dispatch({ ...props, type: constAction });
        } else {
          this.props.dispatch(props);
        }
      }
      return (constAction ? onNavigate({ ...props, type: constAction }) : onNavigate(props));
    };

    return <DefaultRenderer onNavigate={onNavigate} navigationState={navigationState} />;
  }

  render() {
    if (!this.state.reducer) return null;

    return (
      <NavigationRootContainer
        reducer={this.state.reducer}
        renderNavigation={this.renderNavigation}
      />
    );
  }
}

Router.propTypes = propTypes;

export default Router;
