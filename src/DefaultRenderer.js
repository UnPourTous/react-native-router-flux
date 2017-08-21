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
import {
  Animated,
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';

import TabBar from './TabBar';
import NavBar from './NavBar';
import Actions from './Actions';
import { deepestExplicitValueForKey } from './Util';
import NavigationExperimental from 'react-native-experimental-navigation';
import PureRenderMixin from 'react-addons-pure-render-mixin';

const SCREEN_WIDTH = Dimensions.get('window').width;

const {
  AnimatedView: NavigationAnimatedView,
  Card: NavigationCard,
} = NavigationExperimental;

const {
  CardStackPanResponder: NavigationCardStackPanResponder,
  CardStackStyleInterpolator: NavigationCardStackStyleInterpolator,
} = NavigationCard;

const styles = StyleSheet.create({
  animatedView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sceneStyle: {
    flex: 1,
  },
});

function fadeInScene(/* NavigationSceneRendererProps */ props) {
  const {
    position,
    scene,
  } = props;

  const index = scene.index;
  const inputRange = [index - 1, index, index + 1];

  const opacity = position.interpolate({
    inputRange,
    outputRange: [0, 1, 0.3],
  });

  const scale = position.interpolate({
    inputRange,
    outputRange: [1, 1, 0.95],
  });

  const translateY = 0;
  const translateX = 0;

  return {
    opacity,
    transform: [
      { scale },
      { translateX },
      { translateY },
    ],
  };
}

function leftToRight(/* NavigationSceneRendererProps */ props) {
  const {
    position,
    scene,
  } = props;

  const index = scene.index;
  const inputRange = [index - 1, index, index + 1];

  const translateX = position.interpolate({
    inputRange,
    outputRange: [-SCREEN_WIDTH, 0, 0],
  });

  return {
    transform: [
      { translateX },
    ],
  };
}

export default class DefaultRenderer extends Component {

  static propTypes = {
    navigationState: PropTypes.object,
    onNavigate: PropTypes.func,
  };

  static childContextTypes = {
    navigationState: PropTypes.any,
  };

  constructor(props) {
    super(props);

    this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
    this.renderCard = this.renderCard.bind(this);
    this.renderScene = this.renderScene.bind(this);
    this.renderHeader = this.renderHeader.bind(this);
  }

  getChildContext() {
    return {
      navigationState: this.props.navigationState,
    };
  }

  componentDidMount() {
    this.dispatchFocusAction(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.navigationState !== this.props.navigationState) {
      this.dispatchFocusAction(nextProps);
    }
  }

  getPanHandlers(direction, props) {
    return direction === 'vertical' ?
      NavigationCardStackPanResponder.forVertical(props) :
      NavigationCardStackPanResponder.forHorizontal(props);
  }

  dispatchFocusAction({ navigationState }) {
    if (!navigationState || navigationState.component || navigationState.tabs) {
      return;
    }
    const scene = navigationState.children[navigationState.index];
    Actions.focus({ scene });
  }

  chooseInterpolator(direction, props) {
    switch (direction) {
      case 'vertical':
        return NavigationCardStackStyleInterpolator.forVertical(props);
      case 'fade':
        return fadeInScene(props);
      case 'leftToRight':
        return leftToRight(props);
      default:
        return NavigationCardStackStyleInterpolator.forHorizontal(props);
    }
  }

  /**
   * @EIRC 渲染Scene的内容部分
   * @param props
   * @returns {XML}
   */
  renderCard(/* NavigationSceneRendererProps */ props) {
    const { key,
      direction,
      animation,
      getSceneStyle,
      getPanHandlers,
    } = props.scene.navigationState;

    const state = props.navigationState;
    const child = state.children[state.index];
    let selected = state.children[state.index];
    while (selected.hasOwnProperty('children')) {
      selected = selected.children[selected.index];
    }
    let { panHandlers, animationStyle } = selected;
    const isActive = child === selected;
    const computedProps = { isActive };
    if (isActive) {
      computedProps.hideNavBar = deepestExplicitValueForKey(props.navigationState, 'hideNavBar');
      computedProps.hideTabBar = deepestExplicitValueForKey(props.navigationState, 'hideTabBar');
    }

    const style = getSceneStyle ? getSceneStyle(props, computedProps) : null;

    // direction overrides animation if both are supplied
    const animType = (animation && !direction) ? animation : direction;

    if (typeof(animationStyle) === 'undefined') {
      animationStyle = this.chooseInterpolator(animType, props);
    }

    if (typeof(animationStyle) === 'function') {
      animationStyle = animationStyle(props);
    }

    if (typeof(panHandlers) === 'undefined') {
      panHandlers = getPanHandlers ?
        getPanHandlers(props, direction) :
        this.getPanHandlers(direction, props);
    }
    return (
      <NavigationCard
        {...props}
        key={`card_${key}`}
        style={[animationStyle, style]}
        panHandlers={panHandlers}
        renderScene={this.renderScene}
      />
    );
  }

  renderScene(/* NavigationSceneRendererProps */ props) {
    return (
      <DefaultRenderer
        navigationSceneRendererProps={props}
        key={props.scene.navigationState.key}
        onNavigate={props.onNavigate}
        navigationState={props.scene.navigationState}
      />
    );
  }

  /**
   * @EIRC 渲染Scene的NavBar部分
   * @param props
   * @returns {*}
   */
  renderHeader(/* NavigationSceneRendererProps */ props) {
    const state = props.navigationState;
    const child = state.children[state.index];
    let selected = state.children[state.index];
    while (selected.hasOwnProperty('children')) {
      selected = selected.children[selected.index];
    }
    if (child !== selected) {
      // console.log(`SKIPPING renderHeader because ${child.key} !== ${selected.key}`);
      return null;
    }
    const hideNavBar = deepestExplicitValueForKey(state, 'hideNavBar');
    let fromScene = state.from || (state.children[state.index - 1])
    let toScene = selected
    if (toScene && fromScene && fromScene.hideNavBar !== toScene.hideNavBar) {
      // 如果两个页面的 hideNavBar 值不一样，那这个页面还是要渲染出NavBar的, 要做动画
    } else {
      if (hideNavBar) {
        return null;
      }
    }

    // console.log(`renderHeader for ${child.key}`);

    if (selected.component && selected.component.renderNavigationBar) {
      return selected.component.renderNavigationBar({ ...props, ...selected });
    }

    const HeaderComponent = selected.navBar || child.navBar || state.navBar || NavBar;
    const navBarProps = { ...state, ...child, ...selected };

    if (selected.component && selected.component.onRight) {
      navBarProps.onRight = selected.component.onRight;
    }

    if (selected.component && selected.component.onLeft) {
      navBarProps.onLeft = selected.component.onLeft;
    }

    if ((navBarProps.leftTitle || navBarProps.leftButtonImage) && navBarProps.onLeft) {
      delete navBarProps.leftButton;
    }

    if ((navBarProps.rightTitle || navBarProps.rightButtonImage) && navBarProps.onRight) {
      delete navBarProps.rightButton;
    }

    if (navBarProps.rightButton) {
      delete navBarProps.rightTitle;
      delete navBarProps.onRight;
      delete navBarProps.rightButtonImage;
    }

    if (navBarProps.leftButton) {
      delete navBarProps.leftTitle;
      delete navBarProps.onLeft;
      delete navBarProps.leftButtonImage;
    }
    delete navBarProps.style;

    const getTitle = selected.getTitle || (opts => opts.title);
    return <HeaderComponent {...props} {...navBarProps} getTitle={getTitle} />;
  }

  render() {
    const { navigationState, onNavigate } = this.props;

    if (!navigationState || !onNavigate) {
      console.error('navigationState and onNavigate property should be not null');
      return null;
    }

    let SceneComponent = navigationState.component;

    if (navigationState.tabs && !SceneComponent) {
      SceneComponent = TabBar;
    }

    if (SceneComponent) {
      const {
        position,
        scene,
      } = this.props.navigationSceneRendererProps;

      const index = scene.index;
      const inputRange = [index - 1, index - 0.5, index, index + 0.5, index + 1];

      const opacity = position.interpolate({
        inputRange,
        outputRange: [0, 0.2, 1, 0.2, 0],
      });

      const shadowWidth = navigationState.sceneShawdow && navigationState.sceneShawdow.width ? navigationState.sceneShawdow.width : 0
      const shadowImageURI = navigationState.sceneShawdow && navigationState.sceneShawdow.imageURI
        ? navigationState.sceneShawdow.imageURI
        : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAABCAYAAAASC7TOAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABZJREFUeNpiZIAAXiAWAmIxJCwEEGAABOEAdZCugfAAAAAASUVORK5CYII='
      return (
        <View
          style={[styles.sceneStyle, {
            width: Dimensions.get('window').width + shadowWidth,
            backgroundColor: 'green',
            justifyContent: 'flex-end'
          }, navigationState.sceneStyle]}>

          <Animated.Image
            resizeMode={'stretch'}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: shadowWidth,
              left: -1 * shadowWidth,
              alignSelf: 'stretch',
              opacity
            }} source={{uri: imageURI}} />
          <SceneComponent {...this.props} {...navigationState} />
        </View>
      );
    }

    const optionals = {};
    const selected = navigationState.children[navigationState.index];
    const applyAnimation = selected.applyAnimation || navigationState.applyAnimation;
    const style = selected.style || navigationState.style;

    if (applyAnimation) {
      optionals.applyAnimation = applyAnimation;
    } else {
      let duration = selected.duration;
      if (duration === null || duration === undefined) duration = navigationState.duration;
      if (duration !== null && duration !== undefined) {
        /**
         * @ERIC 这里会传给里面的 NavigationAnimatedView 定制动画
         * @param pos this.state.position NavigationAnimatedView 回传回来的 position
         * @param navState this.props.navigationState 回传回来的 导航状态, 这其实是从外层传进去的, navigationState
         */
        optionals.applyAnimation = (pos, navState) => {
          if (duration === 0) {
            pos.setValue(navState.index);
          } else {
            Animated.timing(pos, { toValue: navState.index, duration }).start();
          }
        };
      }
    }

    // console.log(`NavigationAnimatedView for ${navigationState.key}`);

    return (
      <NavigationAnimatedView
        navigationState={navigationState}
        style={[styles.animatedView, style]}
        renderOverlay={this.renderHeader}
        renderScene={this.renderCard}
        {...optionals}
      />
    );
  }
}
