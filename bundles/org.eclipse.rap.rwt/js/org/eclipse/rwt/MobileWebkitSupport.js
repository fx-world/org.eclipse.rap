/*******************************************************************************
 * Copyright (c) 2010, 2012 Innoopract Informationssysteme GmbH and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     EclipseSource - ongoing development
 *     Austin Riddle (Texas Center for Applied Technology) - draggable types
 ******************************************************************************/

qx.Class.define( "org.eclipse.rwt.MobileWebkitSupport", {

  type : "static",

  statics : {
    // These represent widget types and (optionally) defined appearances that are used to determine
    // if the widget is draggable.  If appearances are defined for a type, then one of the
    // appearances must match to allow the widget to be draggable.
    _draggableTypes : {
      "org.eclipse.swt.widgets.Shell" : null,
      "org.eclipse.swt.widgets.Sash"  : null,
      "org.eclipse.swt.widgets.Scale" : [ "scale-thumb" ],
      "org.eclipse.swt.widgets.Slider" : [ "slider-thumb" ],
      "org.eclipse.rwt.widgets.ScrollBar" : null,
      "org.eclipse.swt.custom.ScrolledComposite" : [ "scrollbar-thumb" ],
      "org.eclipse.rwt.widgets.BasicButton" : [ "scrollbar-thumb" ],
      "qx.ui.layout.CanvasLayout" : [ "coolitem-handle" ],
      "org.eclipse.swt.widgets.List" : [ "scrollbar-thumb" ],
      "org.eclipse.rwt.widgets.Grid" : [ "tree-column", "label", "image", "scrollbar-thumb" ]
    },
    _lastMouseOverTarget : null,
    _lastMouseClickTarget : null,
    _lastMouseClickTime : null,
    _mouseEnabled : true,
    _fullscreen : window.navigator.standalone,
    _touchListener : null,
    _gestureListener : null,
    _touchSession : null,
    _allowNativeScroll : false,

    _allowedMouseEvents : {
      "INPUT" : {
        "mousedown" : true,
        "mouseup" : true
      },
      "TEXTAREA" : {
        "mousedown" : true,
        "mouseup" : true
      },
      "*" : {
        "mousewheel" : true
      }
    },

    init : function() {
      if( org.eclipse.rwt.Client.supportsTouch() ) {
        this._configureToolTip();
        this._hideTabHighlight();
        this._bindListeners();
        this._registerListeners();
        this._registerFilter();
        // scrolling is currently very buggy in android, deactivated:
        this.setTouchScrolling( !org.eclipse.rwt.Client.isAndroidBrowser() );
      }
    },

    // API for registration of custom-widgets for touch handling
    addDraggableType : function( type ) {
      // protect already registered types
      var exists = type in this._draggableTypes;
      if( !exists ) {
        this._draggableTypes[type] = null;
      }
    },

    // Experimental API for custom-widget
    setTouchListener : function( func, context ) {
      this._touchListener = [ func, context ];
    },

    // Experimental API for custom-widget
    setGestureListener : function( func, context ) {
      this._gestureListener = [ func, context ];
    },

    setTouchScrolling : function( value ) {
      this._allowNativeScroll = value;
    },

    _isZoomed : function() {
      var vertical = window.orientation % 180 === 0;
      var width = vertical ? screen.width : screen.height;
      return window.innerWidth !== width;
    },

    _configureToolTip : function() {
      var toolTip = org.eclipse.rwt.widgets.WidgetToolTip.getInstance();
      toolTip.setShowInterval( 600 );
      toolTip.setHideInterval( 15000 );
      toolTip.setMousePointerOffsetX( -35 );
      toolTip.setMousePointerOffsetY( -100 );
      var manager = qx.ui.popup.ToolTipManager.getInstance();
      manager.handleMouseEvent = function( event ) {
        var type = event.getType();
        if( type === "mousedown" ) {
          this._handleMouseOver( event );
        } else if ( type === "mouseup" ) {
          this.setCurrentToolTip( null );
        }
      };
    },

    _hideTabHighlight : function() {
      qx.html.StyleSheet.createElement( " * { -webkit-tap-highlight-color: rgba(0,0,0,0); }" );
    },

    _bindListeners : function() {
       this.__onTouchEvent = qx.lang.Function.bind( this._onTouchEvent, this );
       this.__onGestureEvent = qx.lang.Function.bind( this._onGestureEvent, this );
       this.__onOrientationEvent = qx.lang.Function.bind( this._onOrientationEvent, this );
    },

    _registerListeners : function() {
      var target = document.body;
      target.ontouchstart = this.__onTouchEvent;
      target.ontouchmove = this.__onTouchEvent;
      target.ontouchend = this.__onTouchEvent;
      target.ontouchcancel = this.__onTouchEvent;
      target.ongesturestart = this.__onGestureEvent;
      target.ongesturechange = this.__onGestureEvent;
      target.ongestureend = this.__onGestureEvent;
      target.onorientationchange = this.__onOrientationEvent;
    },

    _removeListeners : function() {
      var target = document.body;
      target.ontouchstart = null;
      target.ontouchmove = null;
      target.ontouchend = null;
      target.ontouchcancel = null;
      target.ongesturestart = null;
      target.ongesturechange = null;
      target.ongestureend = null;
      target.onorientationchange = null;
    },

    _registerFilter : function() {
      var eventHandler = org.eclipse.rwt.EventHandler;
      eventHandler.setMouseEventFilter( this._filterMouseEvents, this );
    },

    _filterMouseEvents : function( event ) {
      var allowedMap = this._allowedMouseEvents;
      var result = typeof event.originalEvent === "object"; // faked event?
      if( !result ) {
        result = allowedMap[ "*" ][ event.type ] === true;
      }
      if( !result && typeof allowedMap[ event.target.tagName ] === "object" ) {
        result = allowedMap[ event.target.tagName ][ event.type ] === true;
      }
      if( !result ) {
        event.preventDefault();
        event.returnValue = false;
      }
      return result;
    },

    _onTouchEvent : function( domEvent ) {
      try {
        if( !org.eclipse.swt.EventUtil.getSuspended() ) {
          var type = domEvent.type;
          if( this._mouseEnabled ) {
            switch( type ) {
            case "touchstart":
              this._handleTouchStart( domEvent );
              break;
            case "touchend":
              this._handleTouchEnd( domEvent );
              break;
            case "touchmove":
              this._handleTouchMove( domEvent );
              break;
            }
          } else {
            if( this._touchListener !== null ) {
              this._touchListener[ 0 ].call( this._touchListener[ 1 ], domEvent );
            }
          }
        } else {
          domEvent.preventDefault();
        }
      } catch( ex ) {
        // problem: touch events emulate mouse events. When an error occurs in the emulation
        // layer, it would be ignored. However, if the ErrorHandler is called here, it will be
        // called twice if the error occurs within the mouse event handling. Therefore only
        // alert is used for now:
        alert( "Error in touch event handling:" + ex );
        if( typeof console === "object" ) {
          console.log( ex );
          if( ex.stack ) {
            console.log( ex.stack );
          }
        }
      }
    },

    _getTouch : function( domEvent ) {
      var touch = domEvent.touches.item( 0 );
      if( touch === null ) {
        // Should happen at touchend (behavior seems unpredictable)
        touch = domEvent.changedTouches.item( 0 );
      }
      return touch;
    },

    _handleTouchStart : function( domEvent ) {
      var touch = this._getTouch( domEvent );
      var target = domEvent.target;
      var widgetTarget = org.eclipse.rwt.EventHandlerUtil.getOriginalTargetObject( target );
      var pos = [ touch.clientX, touch.clientY ];
      this._touchSession = {
       "type" : this._getSessionType( widgetTarget ),
       "initialTarget" : target,
       "widgetTarget" : widgetTarget,
       "initialPosition" : pos
      };
      if(    !this._touchSession.type.scroll
          && !this._touchSession.type.outerScroll
          && !this._touchSession.type.focus )
      {
        domEvent.preventDefault();
      }
      this._moveMouseTo( target, domEvent );
      this._fireMouseEvent( "mousedown", target, domEvent, pos );
      if( this._touchSession.type.virtualScroll ) {
        this._initVirtualScroll( widgetTarget );
      }
    },

    _handleTouchMove : function( domEvent ) {
      if( this._touchSession !== null ) {
        var touch = this._getTouch( domEvent );
        var pos = [ touch.clientX, touch.clientY ];
        if( !this._touchSession.type.scroll ) {
          domEvent.preventDefault();
        }
        if( this._touchSession.type.virtualScroll ) {
          this._handleVirtualScroll( pos );
        }
        if ( this._touchSession.type.drag ) {
          domEvent.preventDefault();
          var target = domEvent.target;
          this._fireMouseEvent( "mousemove", target, domEvent, pos );
        } else {
          var oldPos = this._touchSession.initialPosition;
          // TODO [tb] : offset too big for good use with touch-scrolling
          if(    Math.abs( oldPos[ 0 ] - pos[ 0 ] ) >= 15
              || Math.abs( oldPos[ 1 ] - pos[ 1 ] ) >= 15 )
          {
            this._cancelMouseSession( domEvent );
          }
        }
      }
    },

    _handleTouchEnd : function( domEvent ) {
      domEvent.preventDefault();
      var touch = this._getTouch( domEvent );
      var pos = [ touch.clientX, touch.clientY ];
      var target = domEvent.target;
      if( this._touchSession !== null ) {
        if( this._touchSession.type.click ) {
          this._fireMouseEvent( "mouseup", target, domEvent, pos );
        }
        if( this._touchSession.type.virtualScroll ) {
          this._finishVirtualScroll();
        }
        if( this._touchSession.type.click && this._touchSession.initialTarget === target ) {
          this._fireMouseEvent( "click", target, domEvent, pos );
          this._touchSession = null;
          if( this._isDoubleClick( domEvent ) ) {
            this._lastMouseClickTarget = null;
            this._lastMouseClickTime = null;
            this._fireMouseEvent( "dblclick", target, domEvent, pos );
          } else {
            this._lastMouseClickTarget = target;
            this._lastMouseClickTime = ( new Date() ).getTime();
          }
        }
      }
    },

    _getSessionType : function( widgetTarget ) {
      var result = {};
      result.click = true;
      if( this._isDraggableWidget( widgetTarget ) ) {
        result.drag = true;
      } else if( this._isGridRow( widgetTarget ) ) {
        result.virtualScroll = true;
        result.outerScroll = this._allowNativeScroll && this._isScrollableWidget( widgetTarget );
      } else if( this._allowNativeScroll && this._isScrollableWidget( widgetTarget ) ) {
        result.scroll = true;
      } else if( this._isFocusable( widgetTarget ) ) {
        result.focus = true;
      }
      return result;
    },

    ////////////////////
    // virtual scrolling

    _initVirtualScroll : function( widget ) {
      var scrollable;
      if( widget instanceof org.eclipse.rwt.widgets.GridRow ) {
        scrollable = widget.getParent().getParent();
      } else {
        scrollable = this._findScrollable( widget );
      }
      var scrollBarV = scrollable._vertScrollBar;
      var scrollBarH = scrollable._horzScrollBar;
      this._touchSession.scrollBarV = scrollBarV;
      this._touchSession.initScrollY = scrollBarV.getValue();
      this._touchSession.maxScrollY = scrollBarV.getMaximum();
      this._touchSession.scrollBarH = scrollBarH;
      this._touchSession.initScrollX = scrollBarH.getValue();
      this._touchSession.maxScrollX = scrollBarH.getMaximum();
    },

    _handleVirtualScroll : function( pos ) {
      var oldPos = this._touchSession.initialPosition;
      var offsetX = oldPos[ 0 ] - pos[ 0 ];
      var offsetY = oldPos[ 1 ] - pos[ 1 ];
      var newX = this._touchSession.initScrollX + offsetX;
      var newY = this._touchSession.initScrollY + offsetY;
      var max =   this._touchSession.scrollBarV.getMaximum()
                - this._touchSession.scrollBarV._thumbLength;
      var nudged = newY < 0 || newY > max;
      if( this._touchSession.type.outerScroll && nudged ) {
        var outer = this._findScrollable( this._touchSession.widgetTarget );
        var outerValue = outer._vertScrollBar.getValue();
        var outerMax =   outer._vertScrollBar.getMaximum()
                       - outer._vertScrollBar._thumbLength;
        if(    ( newY < 0 && outerValue > 0 )
            || ( newY > max && outerValue < outerMax ) )
        {
          delete this._touchSession.type.virtualScroll;
          this._touchSession.type.scroll = true;
        }
      }
      this._touchSession.scrollBarH.setValue( newX );
      this._touchSession.scrollBarV.setValue( newY );
    },

    _finishVirtualScroll : function() {
      // set ideal value to actual value (prevents scroll on resize when on max position)
      var barV = this._touchSession.scrollBarV;
      barV.setValue( barV.getValue() );
    },

    /////////
    // Helper

    _isFocusable : function( widgetTarget ) {
      return widgetTarget instanceof org.eclipse.rwt.widgets.BasicText;
    },

    _isScrollableWidget : function( widget ) {
      return this._findScrollable( widget ) !== null;
    },

    _isGridRow : function( widgetTarget ) {
      return widgetTarget instanceof org.eclipse.rwt.widgets.GridRow;
    },

    _findScrollable : function( widget ) {
      var result = null;
      var currentWidget = widget;
      do {
        if( currentWidget instanceof org.eclipse.swt.widgets.Scrollable ) {
          result = currentWidget;
        } else if( currentWidget instanceof qx.ui.core.ClientDocument ) {
          currentWidget = null;
        } else {
          currentWidget = currentWidget.getParent();
        }
      } while( currentWidget && !result );
      return result;
    },

    _isDraggableWidget : function ( widgetTarget ) {
      var widgetManager = org.eclipse.swt.WidgetManager.getInstance();
      // We find the nearest control because matching based on widgetTarget can produce too
      // generalized cases.
      var widget = widgetManager.findControl( widgetTarget );
      var draggable = false;
      if( widget == null ) {
        widget = widgetTarget;
      }
      if( widget != null && widget.classname in this._draggableTypes ) {
        var appearances = this._draggableTypes[ widget.classname ];
        if( appearances == null ) {
          draggable = true;
        } else {
          for( var i = 0; i < appearances.length && !draggable; i++ ) {
            if( widgetTarget.getAppearance() === appearances[ i ] ) {
              draggable = true;
            }
          }
        }
      }
      return draggable;
    },

    _isDoubleClick : function( domEvent ) {
      var target = domEvent.target;
      var result = false;
      if( this._lastMouseClickTarget === target ) {
        var diff = ( ( new Date() ).getTime() ) - this._lastMouseClickTime;
        result = diff < org.eclipse.swt.EventUtil.DOUBLE_CLICK_TIME;
      }
      return result;
    },

    _onGestureEvent : function( domEvent ) {
      domEvent.preventDefault();
      var type = domEvent.type;
      if( this._gestureListener !== null ) {
        this._gestureListener[ 0 ].call( this._gestureListener[ 1 ], domEvent );
      }
      switch( type ) {
        case "gesturestart":
          this._disableMouse( domEvent );
        break;
        case "gestureend":
          this._enableMouse( domEvent );
        break;
      }
    },

    _onOrientationEvent : function( domEvent ) {
      // Nothing to do yet
    },

    ////////////////
    // emulate mouse

    _disableMouse : function( domEvent ) {
      // Note: Safari already does somthing similar to this (a touchevent
      // that executes JavaScript will prevent further touch/gesture events),
      // but no in all cases, e.g. on a touchstart with two touches.
      this._cancelMouseSession( domEvent );
      this._mouseEnabled = false;
    },

    _cancelMouseSession : function( domEvent ) {
      var dummy = this._getDummyTarget();
      this._moveMouseTo( dummy, domEvent );
      if( this._touchSession !== null ) {
        this._fireMouseEvent( "mouseup", dummy, domEvent, [ 0, 0 ] );
        delete this._touchSession.type.click;
      }
    },

    // The target used to release the virtual mouse without consequences
    _getDummyTarget : function() {
      return qx.ui.core.ClientDocument.getInstance()._getTargetNode();
    },

    _enableMouse : function() {
      this._mouseEnabled = true;
    },

    _moveMouseTo : function( target, domEvent ) {
      var oldTarget = this._lastMouseOverTarget;
      if( oldTarget !== target ) {
        var pos = [ 0, 0 ];
        if( oldTarget !== null ) {
          this._fireMouseEvent( "mouseout", oldTarget, domEvent, pos );
        }
        this._lastMouseOverTarget = target;
        this._fireMouseEvent( "mouseover", target, domEvent, pos );
      }
    },

    _fireMouseEvent : function( type, target, originalEvent, coordiantes ) {
      var event = document.createEvent( "MouseEvent" );
      event.initMouseEvent( type,
                            true, // bubbles
                            true, //cancelable
                            window, //view
                            0, // detail
                            coordiantes[ 0 ], // screenX
                            coordiantes[ 1 ], //screenY
                            coordiantes[ 0 ], //clientX
                            coordiantes[ 1 ], //clientY
                            false, //ctrlKey
                            false, //altKey
                            false, //shiftKey
                            false, //metaKey
                            qx.event.type.MouseEvent.buttons.left,
                            null );
      event.originalEvent = originalEvent;
      target.dispatchEvent( event );
    },

    _postMouseEvent : function( type ) {
      if( type === "mouseup" ) {
        qx.ui.popup.ToolTipManager.getInstance().setCurrentToolTip( null );
      }
    }

  }

} );
