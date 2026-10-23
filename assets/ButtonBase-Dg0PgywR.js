import{s as e}from"./rolldown-runtime-BG2f4sTM.js";import{n as t,t as n}from"./jsx-runtime-CAqYUFj9.js";import{A as r,Y as i,b as a,et as o,i as s,p as c,s as l,x as u}from"./Typography-Bx12EuZ6.js";var d=e(t()),f=typeof window<`u`?d.useLayoutEffect:d.useEffect,p=0;function m(e){let[t,n]=d.useState(e),r=e||t;return d.useEffect(()=>{t??(p+=1,n(`mui-${p}`))},[t]),r}var h={...d}.useId;function g(e){if(h!==void 0){let t=h();return e??t}return m(e)}var _=g;function v(...e){let t=d.useRef(void 0),n=d.useCallback(t=>{let n=e.map(e=>{if(e==null)return null;if(typeof e==`function`){let n=e,r=n(t);return typeof r==`function`?r:()=>{n(null)}}return e.current=t,()=>{e.current=null}});return()=>{n.forEach(e=>e?.())}},e);return d.useMemo(()=>e.every(e=>e==null)?null:e=>{t.current&&=(t.current(),void 0),e!=null&&(t.current=n(e))},e)}var y=v;function b(e){try{return e.matches(`:focus-visible`)}catch{}return!1}function x(e){let t=d.useRef(e);return f(()=>{t.current=e}),d.useRef((...e)=>(0,t.current)(...e)).current}var S=x,C={};function w(e,t){let n=d.useRef(C);return n.current===C&&(n.current=e(t)),n}var T=class e{static create(){return new e}static use(){let t=w(e.create).current,[n,r]=d.useState(!1);return t.shouldMount=n,t.setShouldMount=r,d.useEffect(t.mountEffect,[n]),t}constructor(){this.ref={current:null},this.mounted=null,this.didMount=!1,this.shouldMount=!1,this.setShouldMount=null}mount(){return this.mounted||(this.mounted=E(),this.shouldMount=!0,this.setShouldMount(this.shouldMount)),this.mounted}mountEffect=()=>{this.shouldMount&&!this.didMount&&this.ref.current!==null&&(this.didMount=!0,this.mounted.resolve())};start(...e){this.mount().then(()=>this.ref.current?.start(...e))}stop(...e){this.mount().then(()=>this.ref.current?.stop(...e))}pulsate(...e){this.mount().then(()=>this.ref.current?.pulsate(...e))}};function ee(){return T.use()}function E(){let e,t,n=new Promise((n,r)=>{e=n,t=r});return n.resolve=e,n.reject=t,n}function D(e,t){if(e==null)return{};var n={};for(var r in e)if({}.hasOwnProperty.call(e,r)){if(t.indexOf(r)!==-1)continue;n[r]=e[r]}return n}function te(e){if(e===void 0)throw ReferenceError(`this hasn't been initialised - super() hasn't been called`);return e}function O(e,t){return O=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},O(e,t)}function k(e,t){e.prototype=Object.create(t.prototype),e.prototype.constructor=e,O(e,t)}var A=d.createContext(null);function j(e,t){var n=function(e){return t&&(0,d.isValidElement)(e)?t(e):e},r=Object.create(null);return e&&d.Children.map(e,function(e){return e}).forEach(function(e){r[e.key]=n(e)}),r}function M(e,t){e||={},t||={};function n(n){return n in t?t[n]:e[n]}var r=Object.create(null),i=[];for(var a in e)a in t?i.length&&(r[a]=i,i=[]):i.push(a);var o,s={};for(var c in t){if(r[c])for(o=0;o<r[c].length;o++){var l=r[c][o];s[r[c][o]]=n(l)}s[c]=n(c)}for(o=0;o<i.length;o++)s[i[o]]=n(i[o]);return s}function N(e,t,n){return n[t]==null?e.props[t]:n[t]}function P(e,t){return j(e.children,function(n){return(0,d.cloneElement)(n,{onExited:t.bind(null,n),in:!0,appear:N(n,`appear`,e),enter:N(n,`enter`,e),exit:N(n,`exit`,e)})})}function ne(e,t,n){var r=j(e.children),i=M(t,r);return Object.keys(i).forEach(function(a){var o=i[a];if((0,d.isValidElement)(o)){var s=a in t,c=a in r,l=t[a],u=(0,d.isValidElement)(l)&&!l.props.in;c&&(!s||u)?i[a]=(0,d.cloneElement)(o,{onExited:n.bind(null,o),in:!0,exit:N(o,`exit`,e),enter:N(o,`enter`,e)}):!c&&s&&!u?i[a]=(0,d.cloneElement)(o,{in:!1}):c&&s&&(0,d.isValidElement)(l)&&(i[a]=(0,d.cloneElement)(o,{onExited:n.bind(null,o),in:l.props.in,exit:N(o,`exit`,e),enter:N(o,`enter`,e)}))}}),i}var F=Object.values||function(e){return Object.keys(e).map(function(t){return e[t]})},I={component:`div`,childFactory:function(e){return e}},L=function(e){k(t,e);function t(t,n){var r=e.call(this,t,n)||this;return r.state={contextValue:{isMounting:!0},handleExited:r.handleExited.bind(te(r)),firstRender:!0},r}var n=t.prototype;return n.componentDidMount=function(){this.mounted=!0,this.setState({contextValue:{isMounting:!1}})},n.componentWillUnmount=function(){this.mounted=!1},t.getDerivedStateFromProps=function(e,t){var n=t.children,r=t.handleExited;return{children:t.firstRender?P(e,r):ne(e,n,r),firstRender:!1}},n.handleExited=function(e,t){var n=j(this.props.children);e.key in n||(e.props.onExited&&e.props.onExited(t),this.mounted&&this.setState(function(t){var n=o({},t.children);return delete n[e.key],{children:n}}))},n.render=function(){var e=this.props,t=e.component,n=e.childFactory,r=D(e,[`component`,`childFactory`]),i=this.state.contextValue,a=F(this.state.children).map(n);return delete r.appear,delete r.enter,delete r.exit,t===null?d.createElement(A.Provider,{value:i},a):d.createElement(A.Provider,{value:i},d.createElement(t,r,a))},t}(d.Component);L.propTypes={},L.defaultProps=I;var R=[];function z(e){d.useEffect(e,R)}var B=class e{static create(){return new e}currentId=null;start(e,t){this.clear(),this.currentId=setTimeout(()=>{this.currentId=null,t()},e)}clear=()=>{this.currentId!==null&&(clearTimeout(this.currentId),this.currentId=null)};disposeEffect=()=>this.clear};function V(){let e=w(B.create).current;return z(e.disposeEffect),e}var H=n();function re(e){let{className:t,classes:n,pulsate:i=!1,rippleX:a,rippleY:o,rippleSize:s,in:c,onExited:l,timeout:u}=e,[f,p]=d.useState(!1),m=r(t,n.ripple,n.rippleVisible,i&&n.ripplePulsate),h={width:s,height:s,top:-(s/2)+o,left:-(s/2)+a},g=r(n.child,f&&n.childLeaving,i&&n.childPulsate);return!c&&!f&&p(!0),d.useEffect(()=>{if(!c&&l!=null){let e=setTimeout(l,u);return()=>{clearTimeout(e)}}},[l,c,u]),(0,H.jsx)(`span`,{className:m,style:h,children:(0,H.jsx)(`span`,{className:g})})}var U=c(`MuiTouchRipple`,[`root`,`ripple`,`rippleVisible`,`ripplePulsate`,`child`,`childLeaving`,`childPulsate`]),W=550,G=i`
  0% {
    transform: scale(0);
    opacity: 0.1;
  }

  100% {
    transform: scale(1);
    opacity: 0.3;
  }
`,K=i`
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
`,q=i`
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(0.92);
  }

  100% {
    transform: scale(1);
  }
`,J=l(`span`,{name:`MuiTouchRipple`,slot:`Root`})({overflow:`hidden`,pointerEvents:`none`,position:`absolute`,zIndex:0,top:0,right:0,bottom:0,left:0,borderRadius:`inherit`}),Y=l(re,{name:`MuiTouchRipple`,slot:`Ripple`})`
  opacity: 0;
  position: absolute;

  &.${U.rippleVisible} {
    opacity: 0.3;
    transform: scale(1);
    animation-name: ${G};
    animation-duration: ${W}ms;
    animation-timing-function: ${({theme:e})=>e.transitions.easing.easeInOut};
  }

  &.${U.ripplePulsate} {
    animation-duration: ${({theme:e})=>e.transitions.duration.shorter}ms;
  }

  & .${U.child} {
    opacity: 1;
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: currentColor;
  }

  & .${U.childLeaving} {
    opacity: 0;
    animation-name: ${K};
    animation-duration: ${W}ms;
    animation-timing-function: ${({theme:e})=>e.transitions.easing.easeInOut};
  }

  & .${U.childPulsate} {
    position: absolute;
    /* @noflip */
    left: 0px;
    top: 0;
    animation-name: ${q};
    animation-duration: 2500ms;
    animation-timing-function: ${({theme:e})=>e.transitions.easing.easeInOut};
    animation-iteration-count: infinite;
    animation-delay: 200ms;
  }
`,ie=d.forwardRef(function(e,t){let{center:n=!1,classes:i={},className:a,...o}=s({props:e,name:`MuiTouchRipple`}),[c,l]=d.useState([]),u=d.useRef(0),f=d.useRef(null);d.useEffect(()=>{f.current&&=(f.current(),null)},[c]);let p=d.useRef(!1),m=V(),h=d.useRef(null),g=d.useRef(null),_=d.useCallback(e=>{let{pulsate:t,rippleX:n,rippleY:a,rippleSize:o,cb:s}=e;l(e=>[...e,(0,H.jsx)(Y,{classes:{ripple:r(i.ripple,U.ripple),rippleVisible:r(i.rippleVisible,U.rippleVisible),ripplePulsate:r(i.ripplePulsate,U.ripplePulsate),child:r(i.child,U.child),childLeaving:r(i.childLeaving,U.childLeaving),childPulsate:r(i.childPulsate,U.childPulsate)},timeout:W,pulsate:t,rippleX:n,rippleY:a,rippleSize:o},u.current)]),u.current+=1,f.current=s},[i]),v=d.useCallback((e={},t={},r=()=>{})=>{let{pulsate:i=!1,center:a=n||t.pulsate,fakeElement:o=!1}=t;if(e?.type===`mousedown`&&p.current){p.current=!1;return}e?.type===`touchstart`&&(p.current=!0);let s=o?null:g.current,c=s?s.getBoundingClientRect():{width:0,height:0,left:0,top:0},l,u,d;if(a||e===void 0||e.clientX===0&&e.clientY===0||!e.clientX&&!e.touches)l=Math.round(c.width/2),u=Math.round(c.height/2);else{let{clientX:t,clientY:n}=e.touches&&e.touches.length>0?e.touches[0]:e;l=Math.round(t-c.left),u=Math.round(n-c.top)}if(a)d=Math.sqrt((2*c.width**2+c.height**2)/3),d%2==0&&(d+=1);else{let e=Math.max(Math.abs((s?s.clientWidth:0)-l),l)*2+2,t=Math.max(Math.abs((s?s.clientHeight:0)-u),u)*2+2;d=Math.sqrt(e**2+t**2)}e?.touches?h.current===null&&(h.current=()=>{_({pulsate:i,rippleX:l,rippleY:u,rippleSize:d,cb:r})},m.start(80,()=>{h.current&&=(h.current(),null)})):_({pulsate:i,rippleX:l,rippleY:u,rippleSize:d,cb:r})},[n,_,m]),y=d.useCallback(()=>{v({},{pulsate:!0})},[v]),b=d.useCallback((e,t)=>{if(m.clear(),e?.type===`touchend`&&h.current){h.current(),h.current=null,m.start(0,()=>{b(e,t)});return}h.current=null,l(e=>e.length>0?e.slice(1):e),f.current=t},[m]);return d.useImperativeHandle(t,()=>({pulsate:y,start:v,stop:b}),[y,v,b]),(0,H.jsx)(J,{className:r(U.root,i.root,a),ref:g,...o,children:(0,H.jsx)(L,{component:null,exit:!0,children:c})})});function ae(e){return u(`MuiButtonBase`,e)}var oe=c(`MuiButtonBase`,[`root`,`disabled`,`focusVisible`]),se=e=>{let{disabled:t,focusVisible:n,focusVisibleClassName:r,classes:i}=e,o=a({root:[`root`,t&&`disabled`,n&&`focusVisible`]},ae,i);return n&&r&&(o.root+=` ${r}`),o},ce=l(`button`,{name:`MuiButtonBase`,slot:`Root`})({display:`inline-flex`,alignItems:`center`,justifyContent:`center`,position:`relative`,boxSizing:`border-box`,WebkitTapHighlightColor:`transparent`,backgroundColor:`transparent`,outline:0,border:0,margin:0,borderRadius:0,padding:0,cursor:`pointer`,userSelect:`none`,verticalAlign:`middle`,MozAppearance:`none`,WebkitAppearance:`none`,textDecoration:`none`,color:`inherit`,"&::-moz-focus-inner":{borderStyle:`none`},[`&.${oe.disabled}`]:{pointerEvents:`none`,cursor:`default`},"@media print":{colorAdjust:`exact`}}),le=d.forwardRef(function(e,t){let n=s({props:e,name:`MuiButtonBase`}),{action:i,centerRipple:a=!1,children:o,className:c,component:l=`button`,disabled:u=!1,disableRipple:f=!1,disableTouchRipple:p=!1,focusRipple:m=!1,focusVisibleClassName:h,LinkComponent:g=`a`,onBlur:_,onClick:v,onContextMenu:x,onDragLeave:C,onFocus:w,onFocusVisible:T,onKeyDown:E,onKeyUp:D,onMouseDown:te,onMouseLeave:O,onMouseUp:k,onTouchEnd:A,onTouchMove:j,onTouchStart:M,tabIndex:N=0,TouchRippleProps:P,touchRippleRef:ne,type:F,...I}=n,L=d.useRef(null),R=ee(),z=y(R.ref,ne),[B,V]=d.useState(!1);u&&B&&V(!1),d.useImperativeHandle(i,()=>({focusVisible:()=>{V(!0),L.current.focus()}}),[]);let re=R.shouldMount&&!f&&!u;d.useEffect(()=>{B&&m&&!f&&R.pulsate()},[f,m,B,R]);let U=X(R,`start`,te,p),W=X(R,`stop`,x,p),G=X(R,`stop`,C,p),K=X(R,`stop`,k,p),q=X(R,`stop`,e=>{B&&e.preventDefault(),O&&O(e)},p),J=X(R,`start`,M,p),Y=X(R,`stop`,A,p),ae=X(R,`stop`,j,p),oe=X(R,`stop`,e=>{b(e.target)||V(!1),_&&_(e)},!1),le=S(e=>{L.current||=e.currentTarget,b(e.target)&&(V(!0),T&&T(e)),w&&w(e)}),Z=()=>{let e=L.current;return l&&l!==`button`&&!(e.tagName===`A`&&e.href)},ue=S(e=>{m&&!e.repeat&&B&&e.key===` `&&R.stop(e,()=>{R.start(e)}),e.target===e.currentTarget&&Z()&&e.key===` `&&e.preventDefault(),E&&E(e),e.target===e.currentTarget&&Z()&&e.key===`Enter`&&!u&&(e.preventDefault(),v&&v(e))}),de=S(e=>{m&&e.key===` `&&B&&!e.defaultPrevented&&R.stop(e,()=>{R.pulsate(e)}),D&&D(e),v&&e.target===e.currentTarget&&Z()&&e.key===` `&&!e.defaultPrevented&&v(e)}),Q=l;Q===`button`&&(I.href||I.to)&&(Q=g);let $={};Q===`button`?($.type=F===void 0?`button`:F,$.disabled=u):(!I.href&&!I.to&&($.role=`button`),u&&($[`aria-disabled`]=u));let fe=y(t,L),pe={...n,centerRipple:a,component:l,disabled:u,disableRipple:f,disableTouchRipple:p,focusRipple:m,tabIndex:N,focusVisible:B},me=se(pe);return(0,H.jsxs)(ce,{as:Q,className:r(me.root,c),ownerState:pe,onBlur:oe,onClick:v,onContextMenu:W,onFocus:le,onKeyDown:ue,onKeyUp:de,onMouseDown:U,onMouseLeave:q,onMouseUp:K,onDragLeave:G,onTouchEnd:Y,onTouchMove:ae,onTouchStart:J,ref:fe,tabIndex:u?-1:N,type:F,...$,...I,children:[o,re?(0,H.jsx)(ie,{ref:z,center:a,...P}):null]})});function X(e,t,n,r=!1){return S(i=>(n&&n(i),r||e[t](i),!0))}export{k as a,x as c,v as d,_ as f,A as i,b as l,f as m,B as n,D as o,g as p,V as r,S as s,le as t,y as u};