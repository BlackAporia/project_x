import{E as e,G as t,K as n,P as r,Q as i,S as a,b as o,r as s}from"./ModalController-293ZqF5Y.js";import{f as c,i as l,l as u,o as d,t as f,v as p}from"./exports-DhpXOCRA.js";import{r as m}from"./NetworkUtil-Pz2GiCOK.js";import{c as h,o as g}from"./wui-text-BrRr1pD5.js";function _(){try{return t.returnOpenHref(`${m.SECURE_SITE_SDK_ORIGIN}/loading`,`popupWindow`,`width=600,height=800,scrollbars=yes`)}catch{throw Error(`Could not open social popup`)}}async function v(){a.push(`ConnectingFarcaster`);let e=o.getAuthConnector();if(e&&!s.getAccountData()?.farcasterUrl)try{let{url:t}=await e.provider.getFarcasterUri();s.setAccountProp(`farcasterUrl`,t,s.state.activeChain)}catch(e){a.goBack(),r.showError(e)}}async function y(c){a.push(`ConnectingSocial`);let l=o.getAuthConnector(),u=null;try{let e=setTimeout(()=>{throw Error(`Social login timed out. Please try again.`)},45e3);if(l&&c){if(t.isTelegram()||(u=_()),u)s.setAccountProp(`socialWindow`,i(u),s.state.activeChain);else if(!t.isTelegram())throw Error(`Could not create social popup`);let{uri:r}=await l.provider.getSocialRedirectUri({provider:c});if(!r)throw u?.close(),Error(`Could not fetch the social redirect uri`);if(u&&(u.location.href=r),t.isTelegram()){n.setTelegramSocialProvider(c);let e=t.formatTelegramSocialLoginUrl(r);t.openHref(e,`_top`)}clearTimeout(e)}}catch(n){u?.close();let i=t.parseError(n);r.showError(i),e.sendEvent({type:`track`,event:`SOCIAL_LOGIN_ERROR`,properties:{provider:c,message:i}})}}async function b(t){s.setAccountProp(`socialProvider`,t,s.state.activeChain),e.sendEvent({type:`track`,event:`SOCIAL_LOGIN_STARTED`,properties:{provider:t}}),t===`farcaster`?await v():await y(t)}var x=u`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    height: 40px;
    border-radius: ${({borderRadius:e})=>e[20]};
    overflow: hidden;
  }

  wui-icon {
    width: 100%;
    height: 100%;
  }
`,S=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},C=class extends c{constructor(){super(...arguments),this.logo=`google`}render(){return p`<wui-icon color="inherit" size="inherit" name=${this.logo}></wui-icon> `}};C.styles=[d,x],S([h()],C.prototype,`logo`,void 0),C=S([f(`wui-logo`)],C);var w=u`
  :host {
    width: 100%;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({spacing:e})=>e[3]};
    width: 100%;
    background-color: transparent;
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-text {
    text-transform: capitalize;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,T=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},E=class extends c{constructor(){super(...arguments),this.logo=`google`,this.name=`Continue with google`,this.disabled=!1}render(){return p`
      <button ?disabled=${this.disabled} tabindex=${g(this.tabIdx)}>
        <wui-flex gap="2" alignItems="center">
          <wui-image ?boxed=${!0} logo=${this.logo}></wui-image>
          <wui-text variant="lg-regular" color="primary">${this.name}</wui-text>
        </wui-flex>
        <wui-icon name="chevronRight" size="lg" color="default"></wui-icon>
      </button>
    `}};E.styles=[d,l,w],T([h()],E.prototype,`logo`,void 0),T([h()],E.prototype,`name`,void 0),T([h()],E.prototype,`tabIdx`,void 0),T([h({type:Boolean})],E.prototype,`disabled`,void 0),E=T([f(`wui-list-social`)],E);export{b as t};