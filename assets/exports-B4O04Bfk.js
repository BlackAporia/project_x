import{A as e,C as t,D as n,E as r,F as i,G as a,K as o,O as s,P as c,S as l,T as u,W as ee,b as d,it as te,k as ne,n as re,ot as ie,p as ae,q as f,r as p,t as m,u as h,v as oe,w as se,x as ce}from"./ModalController-293ZqF5Y.js";import{d as le,f as g,i as _,l as v,o as y,r as b,t as x,v as S,x as C}from"./exports-DhpXOCRA.js";import{r as w}from"./NetworkUtil-Pz2GiCOK.js";import{t as ue}from"./NavigationUtil-CLCRNDHF.js";import{n as de,t as fe}from"./ErrorUtil-Dh3CRELA.js";import{d as pe,g as me,i as T,m as he}from"./exports-psidwoNx.js";import{t as ge}from"./ConstantsUtil-BQdQM3be.js";import{t as E}from"./HelpersUtil-CHfoGqQl.js";import{t as _e}from"./CaipNetworkUtil-uM1bkInA.js";import{c as D,o as O,s as k,t as ve}from"./wui-text-BrRr1pD5.js";import"./wui-loading-spinner-9YiNc9WZ.js";import"./wui-button-BH6OwrEJ.js";import"./wui-icon-B2_zdvX4.js";import"./wui-icon-link-Bk_bUT_5.js";import"./wui-image-CTVdD8em.js";import"./wui-list-item-B3yEX0b6.js";import"./wui-loading-spinner-7vu0V45N.js";import{t as ye}from"./wui-wallet-switch-DwYoNrMN.js";import"./wui-separator-BEkQWbpb.js";import"./wui-icon-box-CFI7Q1C0.js";import{t as be}from"./wui-list-social-pcWpB7bV.js";import"./wui-shimmer-C_41WIAQ.js";import"./wui-shimmer-B9fEPCxe.js";import{n as xe,t as Se}from"./ref-5l-qpJYb.js";import"./wui-qr-code-DwKZa51s.js";import"./wui-link-GFg91bED.js";import"./wui-icon-box-C0kVBq8u.js";import"./wui-input-text-vCE9HG3_.js";import"./wui-email-input-BAMmXLZf.js";import{t as Ce}from"./HelpersUtil-DchpED-S.js";import"./wui-avatar-C46NwfYY.js";import"./w3m-onramp-providers-footer-CzcknBxs.js";import{n as we,t as Te}from"./wui-list-wallet-DRKkSOxj.js";import"./w3m-activity-list-BVPKpk7M.js";import"./wui-list-token-Boi6Rcfr.js";import"./w3m-tooltip-w7tCA40B.js";import"./wui-loading-thumbnail-CeeNQtP1.js";import"./wui-visual-bsrWN4l1.js";import"./wui-input-text-ZYkT0RHp.js";var Ee=v`
  :host {
    display: block;
  }

  button {
    border-radius: ${({borderRadius:e})=>e[20]};
    background: ${({tokens:e})=>e.theme.foregroundPrimary};
    display: flex;
    gap: ${({spacing:e})=>e[1]};
    padding: ${({spacing:e})=>e[1]};
    color: ${({tokens:e})=>e.theme.textSecondary};
    border-radius: ${({borderRadius:e})=>e[16]};
    height: 32px;
    transition: box-shadow ${({durations:e})=>e.lg}
      ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: box-shadow;
  }

  button wui-flex.avatar-container {
    width: 28px;
    height: 24px;
    position: relative;

    wui-flex.network-image-container {
      position: absolute;
      bottom: 0px;
      right: 0px;
      width: 12px;
      height: 12px;
    }

    wui-flex.network-image-container wui-icon {
      background: ${({tokens:e})=>e.theme.foregroundPrimary};
    }

    wui-avatar {
      width: 24px;
      min-width: 24px;
      height: 24px;
    }

    wui-icon {
      width: 12px;
      height: 12px;
    }
  }

  wui-image,
  wui-icon {
    border-radius: ${({borderRadius:e})=>e[16]};
  }

  wui-text {
    white-space: nowrap;
  }

  button wui-flex.balance-container {
    height: 100%;
    border-radius: ${({borderRadius:e})=>e[16]};
    padding-left: ${({spacing:e})=>e[1]};
    padding-right: ${({spacing:e})=>e[1]};
    background: ${({tokens:e})=>e.theme.foregroundSecondary};
    color: ${({tokens:e})=>e.theme.textPrimary};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button:hover:enabled,
  button:focus-visible:enabled,
  button:active:enabled {
    box-shadow: 0px 0px 8px 0px rgba(0, 0, 0, 0.2);

    wui-flex.balance-container {
      background: ${({tokens:e})=>e.theme.foregroundTertiary};
    }
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled wui-text,
  button:disabled wui-flex.avatar-container {
    opacity: 0.3;
  }
`,A=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},j=class extends g{constructor(){super(...arguments),this.networkSrc=void 0,this.avatarSrc=void 0,this.balance=void 0,this.isUnsupportedChain=void 0,this.disabled=!1,this.loading=!1,this.address=``,this.profileName=``,this.charsStart=4,this.charsEnd=6}render(){return S`
      <button
        ?disabled=${this.disabled}
        class=${O(this.balance?void 0:`local-no-balance`)}
        data-error=${O(this.isUnsupportedChain)}
      >
        ${this.imageTemplate()} ${this.addressTemplate()} ${this.balanceTemplate()}
      </button>
    `}imageTemplate(){let e=this.networkSrc?S`<wui-image src=${this.networkSrc}></wui-image>`:S` <wui-icon size="inherit" color="inherit" name="networkPlaceholder"></wui-icon> `;return S`<wui-flex class="avatar-container">
      <wui-avatar
        .imageSrc=${this.avatarSrc}
        alt=${this.address}
        address=${this.address}
      ></wui-avatar>

      <wui-flex class="network-image-container">${e}</wui-flex>
    </wui-flex>`}addressTemplate(){return S`<wui-text variant="md-regular" color="inherit">
      ${this.address?b.getTruncateString({string:this.profileName||this.address,charsStart:this.profileName?18:this.charsStart,charsEnd:this.profileName?0:this.charsEnd,truncate:this.profileName?`end`:`middle`}):null}
    </wui-text>`}balanceTemplate(){return this.balance?S`<wui-flex alignItems="center" justifyContent="center" class="balance-container"
        >${this.loading?S`<wui-loading-spinner size="md" color="inherit"></wui-loading-spinner>`:S`<wui-text variant="md-regular" color="inherit"> ${this.balance}</wui-text>`}</wui-flex
      >`:null}};j.styles=[y,_,Ee],A([D()],j.prototype,`networkSrc`,void 0),A([D()],j.prototype,`avatarSrc`,void 0),A([D()],j.prototype,`balance`,void 0),A([D({type:Boolean})],j.prototype,`isUnsupportedChain`,void 0),A([D({type:Boolean})],j.prototype,`disabled`,void 0),A([D({type:Boolean})],j.prototype,`loading`,void 0),A([D()],j.prototype,`address`,void 0),A([D()],j.prototype,`profileName`,void 0),A([D()],j.prototype,`charsStart`,void 0),A([D()],j.prototype,`charsEnd`,void 0),j=A([x(`wui-account-button`)],j);var M=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},N=class extends g{constructor(){super(...arguments),this.unsubscribe=[],this.disabled=!1,this.balance=`show`,this.charsStart=4,this.charsEnd=6,this.namespace=void 0,this.isSupported=i.state.allowUnsupportedChain?!0:p.state.activeChain?p.checkIfSupportedNetwork(p.state.activeChain):!0}connectedCallback(){super.connectedCallback(),this.setAccountData(p.getAccountData(this.namespace)),this.setNetworkData(p.getNetworkData(this.namespace))}firstUpdated(){let e=this.namespace;e?this.unsubscribe.push(p.subscribeChainProp(`accountState`,e=>{this.setAccountData(e)},e),p.subscribeChainProp(`networkState`,t=>{this.setNetworkData(t),this.isSupported=p.checkIfSupportedNetwork(e,t?.caipNetwork?.caipNetworkId)},e)):this.unsubscribe.push(ne.subscribeNetworkImages(()=>{this.networkImage=s.getNetworkImage(this.network)}),p.subscribeKey(`activeCaipAddress`,e=>{this.caipAddress=e}),p.subscribeChainProp(`accountState`,e=>{this.setAccountData(e)}),p.subscribeKey(`activeCaipNetwork`,e=>{this.network=e,this.networkImage=s.getNetworkImage(e),this.isSupported=e?.chainNamespace?p.checkIfSupportedNetwork(e?.chainNamespace):!0,this.fetchNetworkImage(e)}))}updated(){this.fetchNetworkImage(this.network)}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(!p.state.activeChain)return null;let e=this.balance===`show`,t=typeof this.balanceVal!=`string`,{formattedText:n}=a.parseBalance(this.balanceVal,this.balanceSymbol);return S`
      <wui-account-button
        .disabled=${!!this.disabled}
        .isUnsupportedChain=${i.state.allowUnsupportedChain?!1:!this.isSupported}
        address=${O(a.getPlainAddress(this.caipAddress))}
        profileName=${O(this.profileName)}
        networkSrc=${O(this.networkImage)}
        avatarSrc=${O(this.profileImage)}
        balance=${e?n:``}
        @click=${this.onClick.bind(this)}
        data-testid=${`account-button${this.namespace?`-${this.namespace}`:``}`}
        .charsStart=${this.charsStart}
        .charsEnd=${this.charsEnd}
        ?loading=${t}
      >
      </wui-account-button>
    `}onClick(){this.isSupported||i.state.allowUnsupportedChain?m.open({namespace:this.namespace}):m.open({view:`UnsupportedChain`})}async fetchNetworkImage(e){e?.assets?.imageId&&(this.networkImage=await s.fetchNetworkImage(e?.assets?.imageId))}setAccountData(e){e&&(this.caipAddress=e.caipAddress,this.balanceVal=e.balance,this.balanceSymbol=e.balanceSymbol,this.profileName=e.profileName,this.profileImage=e.profileImage)}setNetworkData(e){e&&(this.network=e.caipNetwork,this.networkImage=s.getNetworkImage(e.caipNetwork))}};M([D({type:Boolean})],N.prototype,`disabled`,void 0),M([D()],N.prototype,`balance`,void 0),M([D()],N.prototype,`charsStart`,void 0),M([D()],N.prototype,`charsEnd`,void 0),M([D()],N.prototype,`namespace`,void 0),M([k()],N.prototype,`caipAddress`,void 0),M([k()],N.prototype,`balanceVal`,void 0),M([k()],N.prototype,`balanceSymbol`,void 0),M([k()],N.prototype,`profileName`,void 0),M([k()],N.prototype,`profileImage`,void 0),M([k()],N.prototype,`network`,void 0),M([k()],N.prototype,`networkImage`,void 0),M([k()],N.prototype,`isSupported`,void 0);var De=class extends N{};De=M([x(`w3m-account-button`)],De);var Oe=class extends N{};Oe=M([x(`appkit-account-button`)],Oe);var ke=C`
  :host {
    display: block;
    width: max-content;
  }
`,P=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},F=class extends g{constructor(){super(...arguments),this.unsubscribe=[],this.disabled=!1,this.balance=void 0,this.size=void 0,this.label=void 0,this.loadingLabel=void 0,this.charsStart=4,this.charsEnd=6,this.namespace=void 0}firstUpdated(){this.caipAddress=this.namespace?p.getAccountData(this.namespace)?.caipAddress:p.state.activeCaipAddress,this.namespace?this.unsubscribe.push(p.subscribeChainProp(`accountState`,e=>{this.caipAddress=e?.caipAddress},this.namespace)):this.unsubscribe.push(p.subscribeKey(`activeCaipAddress`,e=>this.caipAddress=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return this.caipAddress?S`
          <appkit-account-button
            .disabled=${!!this.disabled}
            balance=${O(this.balance)}
            .charsStart=${O(this.charsStart)}
            .charsEnd=${O(this.charsEnd)}
            namespace=${O(this.namespace)}
          >
          </appkit-account-button>
        `:S`
          <appkit-connect-button
            size=${O(this.size)}
            label=${O(this.label)}
            loadingLabel=${O(this.loadingLabel)}
            namespace=${O(this.namespace)}
          ></appkit-connect-button>
        `}};F.styles=ke,P([D({type:Boolean})],F.prototype,`disabled`,void 0),P([D()],F.prototype,`balance`,void 0),P([D()],F.prototype,`size`,void 0),P([D()],F.prototype,`label`,void 0),P([D()],F.prototype,`loadingLabel`,void 0),P([D()],F.prototype,`charsStart`,void 0),P([D()],F.prototype,`charsEnd`,void 0),P([D()],F.prototype,`namespace`,void 0),P([k()],F.prototype,`caipAddress`,void 0);var Ae=class extends F{};Ae=P([x(`w3m-button`)],Ae);var je=class extends F{};je=P([x(`appkit-button`)],je);var Me=v`
  :host {
    position: relative;
    display: block;
  }

  button {
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  button[data-size='sm'] {
    padding: ${({spacing:e})=>e[2]};
  }

  button[data-size='md'] {
    padding: ${({spacing:e})=>e[3]};
  }

  button[data-size='lg'] {
    padding: ${({spacing:e})=>e[4]};
  }

  button[data-variant='primary'] {
    background: ${({tokens:e})=>e.core.backgroundAccentPrimary};
  }

  button[data-variant='secondary'] {
    background: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  button:hover:enabled {
    border-radius: ${({borderRadius:e})=>e[3]};
  }

  button:disabled {
    cursor: not-allowed;
  }

  button[data-loading='true'] {
    cursor: not-allowed;
  }

  button[data-loading='true'][data-size='sm'] {
    border-radius: ${({borderRadius:e})=>e[32]};
    padding: ${({spacing:e})=>e[2]} ${({spacing:e})=>e[3]};
  }

  button[data-loading='true'][data-size='md'] {
    border-radius: ${({borderRadius:e})=>e[20]};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[4]};
  }

  button[data-loading='true'][data-size='lg'] {
    border-radius: ${({borderRadius:e})=>e[16]};
    padding: ${({spacing:e})=>e[4]} ${({spacing:e})=>e[5]};
  }
`,Ne=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Pe=class extends g{constructor(){super(...arguments),this.size=`md`,this.variant=`primary`,this.loading=!1,this.text=`Connect Wallet`}render(){return S`
      <button
        data-loading=${this.loading}
        data-variant=${this.variant}
        data-size=${this.size}
        ?disabled=${this.loading}
      >
        ${this.contentTemplate()}
      </button>
    `}contentTemplate(){let e={lg:`lg-regular`,md:`md-regular`,sm:`sm-regular`},t={primary:`invert`,secondary:`accent-primary`};return this.loading?S`<wui-loading-spinner
      color=${t[this.variant]}
      size=${this.size}
    ></wui-loading-spinner>`:S` <wui-text variant=${e[this.size]} color=${t[this.variant]}>
        ${this.text}
      </wui-text>`}};Pe.styles=[y,_,Me],Ne([D()],Pe.prototype,`size`,void 0),Ne([D()],Pe.prototype,`variant`,void 0),Ne([D({type:Boolean})],Pe.prototype,`loading`,void 0),Ne([D()],Pe.prototype,`text`,void 0),Pe=Ne([x(`wui-connect-button`)],Pe);var Fe=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Ie=class extends g{constructor(){super(),this.unsubscribe=[],this.size=`md`,this.label=`Connect Wallet`,this.loadingLabel=`Connecting...`,this.open=m.state.open,this.loading=this.namespace?m.state.loadingNamespaceMap.get(this.namespace):m.state.loading,this.unsubscribe.push(m.subscribe(e=>{this.open=e.open,this.loading=this.namespace?e.loadingNamespaceMap.get(this.namespace):e.loading}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return S`
      <wui-connect-button
        size=${O(this.size)}
        .loading=${this.loading}
        @click=${this.onClick.bind(this)}
        data-testid=${`connect-button${this.namespace?`-${this.namespace}`:``}`}
      >
        ${this.loading?this.loadingLabel:this.label}
      </wui-connect-button>
    `}onClick(){this.open?m.close():this.loading||m.open({view:`Connect`,namespace:this.namespace})}};Fe([D()],Ie.prototype,`size`,void 0),Fe([D()],Ie.prototype,`label`,void 0),Fe([D()],Ie.prototype,`loadingLabel`,void 0),Fe([D()],Ie.prototype,`namespace`,void 0),Fe([k()],Ie.prototype,`open`,void 0),Fe([k()],Ie.prototype,`loading`,void 0);var Le=class extends Ie{};Le=Fe([x(`w3m-connect-button`)],Le);var Re=class extends Ie{};Re=Fe([x(`appkit-connect-button`)],Re);var ze=v`
  :host {
    display: block;
  }

  button {
    border-radius: ${({borderRadius:e})=>e[32]};
    display: flex;
    gap: ${({spacing:e})=>e[1]};
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]}
      ${({spacing:e})=>e[1]} ${({spacing:e})=>e[1]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  button[data-size='sm'] > wui-icon-box,
  button[data-size='sm'] > wui-image {
    width: 16px;
    height: 16px;
  }

  button[data-size='md'] > wui-icon-box,
  button[data-size='md'] > wui-image {
    width: 20px;
    height: 20px;
  }

  button[data-size='lg'] > wui-icon-box,
  button[data-size='lg'] > wui-image {
    width: 24px;
    height: 24px;
  }

  wui-image,
  wui-icon-box {
    border-radius: ${({borderRadius:e})=>e[32]};
  }
`,Be=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Ve=class extends g{constructor(){super(...arguments),this.imageSrc=void 0,this.isUnsupportedChain=void 0,this.disabled=!1,this.size=`lg`}render(){return S`
      <button data-size=${this.size} data-testid="wui-network-button" ?disabled=${this.disabled}>
        ${this.visualTemplate()}
        <wui-text variant=${{sm:`sm-regular`,md:`md-regular`,lg:`lg-regular`}[this.size]} color="primary">
          <slot></slot>
        </wui-text>
      </button>
    `}visualTemplate(){return this.isUnsupportedChain?S` <wui-icon-box color="error" icon="warningCircle"></wui-icon-box> `:this.imageSrc?S`<wui-image src=${this.imageSrc}></wui-image>`:S` <wui-icon size="xl" color="default" name="networkPlaceholder"></wui-icon> `}};Ve.styles=[y,_,ze],Be([D()],Ve.prototype,`imageSrc`,void 0),Be([D({type:Boolean})],Ve.prototype,`isUnsupportedChain`,void 0),Be([D({type:Boolean})],Ve.prototype,`disabled`,void 0),Be([D()],Ve.prototype,`size`,void 0),Ve=Be([x(`wui-network-button`)],Ve);var He=C`
  :host {
    display: block;
    width: max-content;
  }
`,Ue=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},We=class extends g{constructor(){super(),this.unsubscribe=[],this.disabled=!1,this.network=p.state.activeCaipNetwork,this.networkImage=s.getNetworkImage(this.network),this.caipAddress=p.state.activeCaipAddress,this.loading=m.state.loading,this.isSupported=i.state.allowUnsupportedChain?!0:p.state.activeChain?p.checkIfSupportedNetwork(p.state.activeChain):!0,this.unsubscribe.push(ne.subscribeNetworkImages(()=>{this.networkImage=s.getNetworkImage(this.network)}),p.subscribeKey(`activeCaipAddress`,e=>{this.caipAddress=e}),p.subscribeKey(`activeCaipNetwork`,e=>{this.network=e,this.networkImage=s.getNetworkImage(e),this.isSupported=e?.chainNamespace?p.checkIfSupportedNetwork(e.chainNamespace):!0,s.fetchNetworkImage(e?.assets?.imageId)}),m.subscribeKey(`loading`,e=>this.loading=e))}firstUpdated(){s.fetchNetworkImage(this.network?.assets?.imageId)}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=this.network?p.checkIfSupportedNetwork(this.network.chainNamespace):!0;return S`
      <wui-network-button
        .disabled=${!!(this.disabled||this.loading)}
        .isUnsupportedChain=${i.state.allowUnsupportedChain?!1:!e}
        imageSrc=${O(this.networkImage)}
        @click=${this.onClick.bind(this)}
        data-testid="w3m-network-button"
      >
        ${this.getLabel()}
        <slot></slot>
      </wui-network-button>
    `}getLabel(){return this.network?!this.isSupported&&!i.state.allowUnsupportedChain?`Switch Network`:this.network.name:this.label?this.label:this.caipAddress?`Unknown Network`:`Select Network`}onClick(){this.loading||(r.sendEvent({type:`track`,event:`CLICK_NETWORKS`}),m.open({view:`Networks`}))}};We.styles=He,Ue([D({type:Boolean})],We.prototype,`disabled`,void 0),Ue([D({type:String})],We.prototype,`label`,void 0),Ue([k()],We.prototype,`network`,void 0),Ue([k()],We.prototype,`networkImage`,void 0),Ue([k()],We.prototype,`caipAddress`,void 0),Ue([k()],We.prototype,`loading`,void 0),Ue([k()],We.prototype,`isSupported`,void 0);var Ge=class extends We{};Ge=Ue([x(`w3m-network-button`)],Ge);var Ke=class extends We{};Ke=Ue([x(`appkit-network-button`)],Ke);var qe=v`
  :host {
    display: block;
  }

  button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({spacing:e})=>e[4]};
    padding: ${({spacing:e})=>e[3]};
    border-radius: ${({borderRadius:e})=>e[4]};
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  wui-flex > wui-icon {
    padding: ${({spacing:e})=>e[2]};
    color: ${({tokens:e})=>e.theme.textInvert};
    background-color: ${({tokens:e})=>e.core.backgroundAccentPrimary};
    border-radius: ${({borderRadius:e})=>e[2]};
    align-items: center;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.core.foregroundAccent020};
    }
  }
`,Je=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Ye=class extends g{constructor(){super(...arguments),this.label=``,this.description=``,this.icon=`wallet`}render(){return S`
      <button>
        <wui-flex gap="2" alignItems="center">
          <wui-icon weight="fill" size="lg" name=${this.icon} color="inherit"></wui-icon>
          <wui-flex flexDirection="column" gap="1">
            <wui-text variant="md-medium" color="primary">${this.label}</wui-text>
            <wui-text variant="md-regular" color="tertiary">${this.description}</wui-text>
          </wui-flex>
        </wui-flex>
        <wui-icon size="lg" color="accent-primary" name="chevronRight"></wui-icon>
      </button>
    `}};Ye.styles=[y,_,qe],Je([D()],Ye.prototype,`label`,void 0),Je([D()],Ye.prototype,`description`,void 0),Je([D()],Ye.prototype,`icon`,void 0),Ye=Je([x(`wui-notice-card`)],Ye);var Xe=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Ze=class extends g{constructor(){super(),this.unsubscribe=[],this.socialProvider=o.getConnectedSocialProvider(),this.socialUsername=o.getConnectedSocialUsername(),this.namespace=p.state.activeChain,this.unsubscribe.push(p.subscribeKey(`activeChain`,e=>{this.namespace=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=d.getConnectorId(this.namespace),t=d.getAuthConnector();if(!t||e!==w.CONNECTOR_ID.AUTH)return this.style.cssText=`display: none`,null;let n=t.provider.getEmail()??``;return!n&&!this.socialUsername?(this.style.cssText=`display: none`,null):S`
      <wui-list-item
        ?rounded=${!0}
        icon=${this.socialProvider??`mail`}
        data-testid="w3m-account-email-update"
        ?chevron=${!this.socialProvider}
        @click=${()=>{this.onGoToUpdateEmail(n,this.socialProvider)}}
      >
        <wui-text variant="lg-regular" color="primary">${this.getAuthName(n)}</wui-text>
      </wui-list-item>
    `}onGoToUpdateEmail(e,t){t||l.push(`UpdateEmailWallet`,{email:e,redirectView:`Account`})}getAuthName(e){return this.socialUsername?this.socialProvider===`discord`&&this.socialUsername.endsWith(`0`)?this.socialUsername.slice(0,-1):this.socialUsername:e.length>30?`${e.slice(0,-3)}...`:e}};Xe([k()],Ze.prototype,`namespace`,void 0),Ze=Xe([x(`w3m-account-auth-button`)],Ze);var Qe=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},$e=class extends g{constructor(){super(),this.usubscribe=[],this.networkImages=ne.state.networkImages,this.address=p.getAccountData()?.address,this.profileImage=p.getAccountData()?.profileImage,this.profileName=p.getAccountData()?.profileName,this.network=p.state.activeCaipNetwork,this.disconnecting=!1,this.remoteFeatures=i.state.remoteFeatures,this.usubscribe.push(p.subscribeChainProp(`accountState`,e=>{e&&(this.address=e.address,this.profileImage=e.profileImage,this.profileName=e.profileName)}),p.subscribeKey(`activeCaipNetwork`,e=>{e?.id&&(this.network=e)}),i.subscribeKey(`remoteFeatures`,e=>{this.remoteFeatures=e}))}disconnectedCallback(){this.usubscribe.forEach(e=>e())}render(){if(!this.address)throw Error(`w3m-account-settings-view: No account provided`);let e=this.networkImages[this.network?.assets?.imageId??``];return S`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="4"
        .padding=${[`0`,`5`,`3`,`5`]}
      >
        <wui-avatar
          alt=${this.address}
          address=${this.address}
          imageSrc=${O(this.profileImage)}
          size="lg"
        ></wui-avatar>
        <wui-flex flexDirection="column" alignItems="center">
          <wui-flex gap="1" alignItems="center" justifyContent="center">
            <wui-text variant="h5-medium" color="primary" data-testid="account-settings-address">
              ${b.getTruncateString({string:this.address,charsStart:4,charsEnd:6,truncate:`middle`})}
            </wui-text>
            <wui-icon-link
              size="md"
              icon="copy"
              iconColor="default"
              @click=${this.onCopyAddress}
            ></wui-icon-link>
          </wui-flex>
        </wui-flex>
      </wui-flex>
      <wui-flex flexDirection="column" gap="4">
        <wui-flex flexDirection="column" gap="2" .padding=${[`6`,`4`,`3`,`4`]}>
          ${this.authCardTemplate()}
          <w3m-account-auth-button></w3m-account-auth-button>
          <wui-list-item
            imageSrc=${O(e)}
            ?chevron=${this.isAllowedNetworkSwitch()}
            ?fullSize=${!0}
            ?rounded=${!0}
            @click=${this.onNetworks.bind(this)}
            data-testid="account-switch-network-button"
          >
            <wui-text variant="lg-regular" color="primary">
              ${this.network?.name??`Unknown`}
            </wui-text>
          </wui-list-item>
          ${this.smartAccountSettingsTemplate()} ${this.chooseNameButtonTemplate()}
          <wui-list-item
            ?rounded=${!0}
            icon="power"
            iconColor="error"
            ?chevron=${!1}
            .loading=${this.disconnecting}
            @click=${this.onDisconnect.bind(this)}
            data-testid="disconnect-button"
          >
            <wui-text variant="lg-regular" color="primary">Disconnect</wui-text>
          </wui-list-item>
        </wui-flex>
      </wui-flex>
    `}chooseNameButtonTemplate(){let e=this.network?.chainNamespace,t=d.getConnectorId(e),n=d.getAuthConnector();return!p.checkIfNamesSupported()||!n||t!==w.CONNECTOR_ID.AUTH||this.profileName?null:S`
      <wui-list-item
        icon="id"
        ?rounded=${!0}
        ?chevron=${!0}
        @click=${this.onChooseName.bind(this)}
        data-testid="account-choose-name-button"
      >
        <wui-text variant="lg-regular" color="primary">Choose account name </wui-text>
      </wui-list-item>
    `}authCardTemplate(){let e=d.getConnectorId(this.network?.chainNamespace),t=d.getAuthConnector(),{origin:n}=location;return!t||e!==w.CONNECTOR_ID.AUTH||n.includes(f.SECURE_SITE)?null:S`
      <wui-notice-card
        @click=${this.onGoToUpgradeView.bind(this)}
        label="Upgrade your wallet"
        description="Transition to a self-custodial wallet"
        icon="wallet"
        data-testid="w3m-wallet-upgrade-card"
      ></wui-notice-card>
    `}isAllowedNetworkSwitch(){let e=p.getAllRequestedCaipNetworks(),t=e?e.length>1:!1,n=e?.find(({id:e})=>e===this.network?.id);return t||!n}onCopyAddress(){try{this.address&&(a.copyToClopboard(this.address),c.showSuccess(`Address copied`))}catch{c.showError(`Failed to copy`)}}smartAccountSettingsTemplate(){let e=this.network?.chainNamespace,t=p.checkIfSmartAccountEnabled(),n=d.getConnectorId(e);return!d.getAuthConnector()||n!==w.CONNECTOR_ID.AUTH||!t?null:S`
      <wui-list-item
        icon="user"
        ?rounded=${!0}
        ?chevron=${!0}
        @click=${this.onSmartAccountSettings.bind(this)}
        data-testid="account-smart-account-settings-button"
      >
        <wui-text variant="lg-regular" color="primary">Smart Account Settings</wui-text>
      </wui-list-item>
    `}onChooseName(){l.push(`ChooseAccountName`)}onNetworks(){this.isAllowedNetworkSwitch()&&l.push(`Networks`)}async onDisconnect(){try{this.disconnecting=!0;let e=this.network?.chainNamespace,t=h.getConnections(e).length>0,n=e&&d.state.activeConnectorIds[e],r=this.remoteFeatures?.multiWallet;await h.disconnect(r?{id:n,namespace:e}:{}),t&&r&&(l.push(`ProfileWallets`),c.showSuccess(`Wallet deleted`))}catch{r.sendEvent({type:`track`,event:`DISCONNECT_ERROR`,properties:{message:`Failed to disconnect`}}),c.showError(`Failed to disconnect`)}finally{this.disconnecting=!1}}onGoToUpgradeView(){r.sendEvent({type:`track`,event:`EMAIL_UPGRADE_FROM_MODAL`}),l.push(`UpgradeEmailWallet`)}onSmartAccountSettings(){l.push(`SmartAccountSettings`)}};Qe([k()],$e.prototype,`address`,void 0),Qe([k()],$e.prototype,`profileImage`,void 0),Qe([k()],$e.prototype,`profileName`,void 0),Qe([k()],$e.prototype,`network`,void 0),Qe([k()],$e.prototype,`disconnecting`,void 0),Qe([k()],$e.prototype,`remoteFeatures`,void 0),$e=Qe([x(`w3m-account-settings-view`)],$e);var et=v`
  :host {
    flex: 1;
    height: 100%;
  }

  button {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]};
    column-gap: ${({spacing:e})=>e[1]};
    color: ${({tokens:e})=>e.theme.textSecondary};
    border-radius: ${({borderRadius:e})=>e[20]};
    background-color: transparent;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button[data-active='true'] {
    color: ${({tokens:e})=>e.theme.textPrimary};
    background-color: ${({tokens:e})=>e.theme.foregroundTertiary};
  }

  button:hover:enabled:not([data-active='true']),
  button:active:enabled:not([data-active='true']) {
    wui-text,
    wui-icon {
      color: ${({tokens:e})=>e.theme.textPrimary};
    }
  }
`,tt=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},nt={lg:`lg-regular`,md:`md-regular`,sm:`sm-regular`},rt={lg:`md`,md:`sm`,sm:`sm`},it=class extends g{constructor(){super(...arguments),this.icon=`mobile`,this.size=`md`,this.label=``,this.active=!1}render(){return S`
      <button data-active=${this.active}>
        ${this.icon?S`<wui-icon size=${rt[this.size]} name=${this.icon}></wui-icon>`:``}
        <wui-text variant=${nt[this.size]}> ${this.label} </wui-text>
      </button>
    `}};it.styles=[y,_,et],tt([D()],it.prototype,`icon`,void 0),tt([D()],it.prototype,`size`,void 0),tt([D()],it.prototype,`label`,void 0),tt([D({type:Boolean})],it.prototype,`active`,void 0),it=tt([x(`wui-tab-item`)],it);var at=v`
  :host {
    display: inline-flex;
    align-items: center;
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[32]};
    padding: ${({spacing:e})=>e[`01`]};
    box-sizing: border-box;
  }

  :host([data-size='sm']) {
    height: 26px;
  }

  :host([data-size='md']) {
    height: 36px;
  }
`,ot=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},st=class extends g{constructor(){super(...arguments),this.tabs=[],this.onTabChange=()=>null,this.size=`md`,this.activeTab=0}render(){return this.dataset.size=this.size,this.tabs.map((e,t)=>{let n=t===this.activeTab;return S`
        <wui-tab-item
          @click=${()=>this.onTabClick(t)}
          icon=${e.icon}
          size=${this.size}
          label=${e.label}
          ?active=${n}
          data-active=${n}
          data-testid="tab-${e.label?.toLowerCase()}"
        ></wui-tab-item>
      `})}onTabClick(e){this.activeTab=e,this.onTabChange(e)}};st.styles=[y,_,at],ot([D({type:Array})],st.prototype,`tabs`,void 0),ot([D()],st.prototype,`onTabChange`,void 0),ot([D()],st.prototype,`size`,void 0),ot([k()],st.prototype,`activeTab`,void 0),st=ot([x(`wui-tabs`)],st);var ct=v`
  wui-icon-link {
    margin-right: calc(${({spacing:e})=>e[8]} * -1);
  }

  wui-notice-card {
    margin-bottom: ${({spacing:e})=>e[1]};
  }

  wui-list-item > wui-text {
    flex: 1;
  }

  w3m-transactions-view {
    max-height: 200px;
  }

  .balance-container {
    display: inline;
  }

  .tab-content-container {
    height: 300px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  .symbol {
    transform: translateY(-2px);
  }

  .tab-content-container::-webkit-scrollbar {
    display: none;
  }

  .account-button {
    width: auto;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({spacing:e})=>e[3]};
    height: 48px;
    padding: ${({spacing:e})=>e[2]};
    padding-right: ${({spacing:e})=>e[3]};
    box-shadow: inset 0 0 0 1px ${({tokens:e})=>e.theme.foregroundPrimary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[6]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e[`ease-out-power-2`]};
  }

  .account-button:hover {
    background-color: ${({tokens:e})=>e.core.glass010};
  }

  .avatar-container {
    position: relative;
  }

  wui-avatar.avatar {
    width: 32px;
    height: 32px;
    box-shadow: 0 0 0 2px ${({tokens:e})=>e.core.glass010};
  }

  wui-wallet-switch {
    margin-top: ${({spacing:e})=>e[2]};
  }

  wui-avatar.network-avatar {
    width: 16px;
    height: 16px;
    position: absolute;
    left: 100%;
    top: 100%;
    transform: translate(-75%, -75%);
    box-shadow: 0 0 0 2px ${({tokens:e})=>e.core.glass010};
  }

  .account-links {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .account-links wui-flex {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    background: red;
    align-items: center;
    justify-content: center;
    height: 48px;
    padding: 10px;
    flex: 1 0 0;
    border-radius: var(--XS, 16px);
    border: 1px solid var(--dark-accent-glass-010, rgba(71, 161, 255, 0.1));
    background: var(--dark-accent-glass-010, rgba(71, 161, 255, 0.1));
    transition:
      background-color ${({durations:e})=>e.md}
        ${({easings:e})=>e[`ease-out-power-1`]},
      opacity ${({durations:e})=>e.md} ${({easings:e})=>e[`ease-out-power-1`]};
    will-change: background-color, opacity;
  }

  .account-links wui-flex:hover {
    background: var(--dark-accent-glass-015, rgba(71, 161, 255, 0.15));
  }

  .account-links wui-flex wui-icon {
    width: var(--S, 20px);
    height: var(--S, 20px);
  }

  .account-links wui-flex wui-icon svg path {
    stroke: #667dff;
  }
`,I=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},L=class extends g{constructor(){super(),this.unsubscribe=[],this.caipAddress=p.getAccountData()?.caipAddress,this.address=a.getPlainAddress(p.getAccountData()?.caipAddress),this.profileImage=p.getAccountData()?.profileImage,this.profileName=p.getAccountData()?.profileName,this.disconnecting=!1,this.balance=p.getAccountData()?.balance,this.balanceSymbol=p.getAccountData()?.balanceSymbol,this.features=i.state.features,this.remoteFeatures=i.state.remoteFeatures,this.namespace=p.state.activeChain,this.activeConnectorIds=d.state.activeConnectorIds,this.unsubscribe.push(p.subscribeChainProp(`accountState`,e=>{this.address=a.getPlainAddress(e?.caipAddress),this.caipAddress=e?.caipAddress,this.balance=e?.balance,this.balanceSymbol=e?.balanceSymbol,this.profileName=e?.profileName,this.profileImage=e?.profileImage}),i.subscribeKey(`features`,e=>this.features=e),i.subscribeKey(`remoteFeatures`,e=>this.remoteFeatures=e),d.subscribeKey(`activeConnectorIds`,e=>{this.activeConnectorIds=e}),p.subscribeKey(`activeChain`,e=>this.namespace=e),p.subscribeKey(`activeCaipNetwork`,e=>{e?.chainNamespace&&(this.namespace=e?.chainNamespace)}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(!this.caipAddress||!this.namespace)return null;let e=this.activeConnectorIds[this.namespace],t=e?d.getConnectorById(e):void 0,n=s.getConnectorImage(t),{value:r,decimals:i,symbol:o}=a.parseBalance(this.balance,this.balanceSymbol);return S`<wui-flex
        flexDirection="column"
        .padding=${[`0`,`5`,`4`,`5`]}
        alignItems="center"
        gap="3"
      >
        <wui-avatar
          alt=${O(this.caipAddress)}
          address=${O(a.getPlainAddress(this.caipAddress))}
          imageSrc=${O(this.profileImage===null?void 0:this.profileImage)}
          data-testid="single-account-avatar"
        ></wui-avatar>
        <wui-wallet-switch
          profileName=${this.profileName}
          address=${this.address}
          imageSrc=${n}
          alt=${t?.name}
          @click=${this.onGoToProfileWalletsView.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>
        <div class="balance-container">
          <wui-text variant="h3-regular" color="primary">${r}</wui-text>
          <wui-text variant="h3-regular" color="secondary">.${i}</wui-text>
          <wui-text variant="h6-medium" color="primary" class="symbol">${o}</wui-text>
        </div>
        ${this.explorerBtnTemplate()}
      </wui-flex>

      <wui-flex flexDirection="column" gap="2" .padding=${[`0`,`3`,`3`,`3`]}>
        ${this.authCardTemplate()} <w3m-account-auth-button></w3m-account-auth-button>
        ${this.orderedFeaturesTemplate()} ${this.activityTemplate()}
        <wui-list-item
          .rounded=${!0}
          icon="power"
          iconColor="error"
          ?chevron=${!1}
          .loading=${this.disconnecting}
          .rightIcon=${!1}
          @click=${this.onDisconnect.bind(this)}
          data-testid="disconnect-button"
        >
          <wui-text variant="lg-regular" color="primary">Disconnect</wui-text>
        </wui-list-item>
      </wui-flex>`}fundWalletTemplate(){if(!this.namespace)return null;let e=f.ONRAMP_SUPPORTED_CHAIN_NAMESPACES.includes(this.namespace),t=!!this.features?.receive,n=this.remoteFeatures?.onramp&&e,r=T.isPayWithExchangeEnabled();return!n&&!t&&!r?null:S`
      <wui-list-item
        .rounded=${!0}
        data-testid="w3m-account-default-fund-wallet-button"
        iconVariant="blue"
        icon="dollar"
        ?chevron=${!0}
        @click=${this.handleClickFundWallet.bind(this)}
      >
        <wui-text variant="lg-regular" color="primary">Fund wallet</wui-text>
      </wui-list-item>
    `}orderedFeaturesTemplate(){return(this.features?.walletFeaturesOrder||f.DEFAULT_FEATURES.walletFeaturesOrder).map(e=>{switch(e){case`onramp`:return this.fundWalletTemplate();case`swaps`:return this.swapsTemplate();case`send`:return this.sendTemplate();default:return null}})}activityTemplate(){return this.namespace&&this.remoteFeatures?.activity&&f.ACTIVITY_ENABLED_CHAIN_NAMESPACES.includes(this.namespace)?S` <wui-list-item
          .rounded=${!0}
          icon="clock"
          ?chevron=${!0}
          @click=${this.onTransactions.bind(this)}
          data-testid="w3m-account-default-activity-button"
        >
          <wui-text variant="lg-regular" color="primary">Activity</wui-text>
        </wui-list-item>`:null}swapsTemplate(){let e=this.remoteFeatures?.swaps,t=p.state.activeChain===w.CHAIN.EVM;return!e||!t?null:S`
      <wui-list-item
        .rounded=${!0}
        icon="recycleHorizontal"
        ?chevron=${!0}
        @click=${this.handleClickSwap.bind(this)}
        data-testid="w3m-account-default-swaps-button"
      >
        <wui-text variant="lg-regular" color="primary">Swap</wui-text>
      </wui-list-item>
    `}sendTemplate(){let e=this.features?.send,t=p.state.activeChain;if(!t)throw Error(`SendController:sendTemplate - namespace is required`);let n=f.SEND_SUPPORTED_NAMESPACES.includes(t);return!e||!n?null:S`
      <wui-list-item
        .rounded=${!0}
        icon="send"
        ?chevron=${!0}
        @click=${this.handleClickSend.bind(this)}
        data-testid="w3m-account-default-send-button"
      >
        <wui-text variant="lg-regular" color="primary">Send</wui-text>
      </wui-list-item>
    `}authCardTemplate(){let e=p.state.activeChain;if(!e)throw Error(`AuthCardTemplate:authCardTemplate - namespace is required`);let t=d.getConnectorId(e),n=d.getAuthConnector(),{origin:r}=location;return!n||t!==w.CONNECTOR_ID.AUTH||r.includes(f.SECURE_SITE)?null:S`
      <wui-notice-card
        @click=${this.onGoToUpgradeView.bind(this)}
        label="Upgrade your wallet"
        description="Transition to a self-custodial wallet"
        icon="wallet"
        data-testid="w3m-wallet-upgrade-card"
      ></wui-notice-card>
    `}handleClickFundWallet(){l.push(`FundWallet`)}handleClickSwap(){l.push(`Swap`)}handleClickSend(){l.push(`WalletSend`)}explorerBtnTemplate(){return p.getAccountData()?.addressExplorerUrl?S`
      <wui-button size="md" variant="accent-primary" @click=${this.onExplorer.bind(this)}>
        <wui-icon size="sm" color="inherit" slot="iconLeft" name="compass"></wui-icon>
        Block Explorer
        <wui-icon size="sm" color="inherit" slot="iconRight" name="externalLink"></wui-icon>
      </wui-button>
    `:null}onTransactions(){r.sendEvent({type:`track`,event:`CLICK_TRANSACTIONS`,properties:{isSmartAccount:oe(p.state.activeChain)===ee.ACCOUNT_TYPES.SMART_ACCOUNT}}),l.push(`Transactions`)}async onDisconnect(){try{this.disconnecting=!0;let e=h.getConnections(this.namespace).length>0,t=this.namespace&&d.state.activeConnectorIds[this.namespace],n=this.remoteFeatures?.multiWallet;await h.disconnect(n?{id:t,namespace:this.namespace}:{}),e&&n&&(l.push(`ProfileWallets`),c.showSuccess(`Wallet deleted`))}catch{r.sendEvent({type:`track`,event:`DISCONNECT_ERROR`,properties:{message:`Failed to disconnect`}}),c.showError(`Failed to disconnect`)}finally{this.disconnecting=!1}}onExplorer(){let e=p.getAccountData()?.addressExplorerUrl;e&&a.openHref(e,`_blank`)}onGoToUpgradeView(){r.sendEvent({type:`track`,event:`EMAIL_UPGRADE_FROM_MODAL`}),l.push(`UpgradeEmailWallet`)}onGoToProfileWalletsView(){l.push(`ProfileWallets`)}};L.styles=ct,I([k()],L.prototype,`caipAddress`,void 0),I([k()],L.prototype,`address`,void 0),I([k()],L.prototype,`profileImage`,void 0),I([k()],L.prototype,`profileName`,void 0),I([k()],L.prototype,`disconnecting`,void 0),I([k()],L.prototype,`balance`,void 0),I([k()],L.prototype,`balanceSymbol`,void 0),I([k()],L.prototype,`features`,void 0),I([k()],L.prototype,`remoteFeatures`,void 0),I([k()],L.prototype,`namespace`,void 0),I([k()],L.prototype,`activeConnectorIds`,void 0),L=I([x(`w3m-account-default-widget`)],L);var lt=v`
  span {
    font-weight: 500;
    font-size: 38px;
    color: ${({tokens:e})=>e.theme.textPrimary};
    line-height: 38px;
    letter-spacing: -2%;
    text-align: center;
    font-family: var(--apkt-fontFamily-regular);
  }

  .pennies {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }
`,ut=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},dt=class extends g{constructor(){super(...arguments),this.dollars=`0`,this.pennies=`00`}render(){return S`<span>$${this.dollars}<span class="pennies">.${this.pennies}</span></span>`}};dt.styles=[y,lt],ut([D()],dt.prototype,`dollars`,void 0),ut([D()],dt.prototype,`pennies`,void 0),dt=ut([x(`wui-balance`)],dt);var ft=v`
  :host {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
  }

  /* -- Variants --------------------------------------------------------- */
  :host([data-variant='fill']) {
    background-color: ${({colors:e})=>e.neutrals100};
  }

  :host([data-variant='shade']) {
    background-color: ${({colors:e})=>e.neutrals900};
  }

  :host([data-variant='fill']) > wui-text {
    color: ${({colors:e})=>e.black};
  }

  :host([data-variant='shade']) > wui-text {
    color: ${({colors:e})=>e.white};
  }

  :host([data-variant='fill']) > wui-icon {
    color: ${({colors:e})=>e.neutrals100};
  }

  :host([data-variant='shade']) > wui-icon {
    color: ${({colors:e})=>e.neutrals900};
  }

  /* -- Sizes --------------------------------------------------------- */
  :host([data-size='sm']) {
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  :host([data-size='md']) {
    padding: ${({spacing:e})=>e[2]} ${({spacing:e})=>e[3]};
    border-radius: ${({borderRadius:e})=>e[3]};
  }

  /* -- Placements --------------------------------------------------------- */
  wui-icon[data-placement='top'] {
    bottom: 0px;
    left: 50%;
    transform: translate(-50%, 95%);
  }

  wui-icon[data-placement='bottom'] {
    top: 0;
    left: 50%;
    transform: translate(-50%, -95%) rotate(180deg);
  }

  wui-icon[data-placement='right'] {
    top: 50%;
    left: 0;
    transform: translate(-65%, -50%) rotate(90deg);
  }

  wui-icon[data-placement='left'] {
    top: 50%;
    right: 0%;
    transform: translate(65%, -50%) rotate(270deg);
  }
`,pt=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},mt={sm:`sm-regular`,md:`md-regular`},ht=class extends g{constructor(){super(...arguments),this.placement=`top`,this.variant=`fill`,this.size=`md`,this.message=``}render(){return this.dataset.variant=this.variant,this.dataset.size=this.size,S`<wui-icon data-placement=${this.placement} size="inherit" name="cursor"></wui-icon>
      <wui-text variant=${mt[this.size]}>${this.message}</wui-text>`}};ht.styles=[y,_,ft],pt([D()],ht.prototype,`placement`,void 0),pt([D()],ht.prototype,`variant`,void 0),pt([D()],ht.prototype,`size`,void 0),pt([D()],ht.prototype,`message`,void 0),ht=pt([x(`wui-tooltip`)],ht);var gt=C`
  :host {
    width: 100%;
    max-height: 280px;
    overflow: scroll;
    scrollbar-width: none;
  }

  :host::-webkit-scrollbar {
    display: none;
  }
`,_t=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},vt=class extends g{render(){return S`<w3m-activity-list page="account"></w3m-activity-list>`}};vt.styles=gt,vt=_t([x(`w3m-account-activity-widget`)],vt);var yt=v`
  :host {
    width: 100%;
  }

  button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: ${({spacing:e})=>e[4]};
    padding: ${({spacing:e})=>e[4]};
    background-color: transparent;
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-text {
    max-width: 174px;
  }

  .tag-container {
    width: fit-content;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }
  }
`,bt=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},xt=class extends g{constructor(){super(...arguments),this.icon=`card`,this.text=``,this.description=``,this.tag=void 0,this.disabled=!1}render(){return S`
      <button ?disabled=${this.disabled}>
        <wui-flex alignItems="center" gap="3">
          <wui-icon-box padding="2" color="secondary" icon=${this.icon} size="lg"></wui-icon-box>
          <wui-flex flexDirection="column" gap="1">
            <wui-text variant="md-medium" color="primary">${this.text}</wui-text>
            ${this.description?S`<wui-text variant="md-regular" color="secondary">
                  ${this.description}</wui-text
                >`:null}
          </wui-flex>
        </wui-flex>

        <wui-flex class="tag-container" alignItems="center" gap="1" justifyContent="flex-end">
          ${this.tag?S`<wui-tag tagType="main" size="sm">${this.tag}</wui-tag>`:null}
          <wui-icon size="md" name="chevronRight" color="default"></wui-icon>
        </wui-flex>
      </button>
    `}};xt.styles=[y,_,yt],bt([D()],xt.prototype,`icon`,void 0),bt([D()],xt.prototype,`text`,void 0),bt([D()],xt.prototype,`description`,void 0),bt([D()],xt.prototype,`tag`,void 0),bt([D({type:Boolean})],xt.prototype,`disabled`,void 0),xt=bt([x(`wui-list-description`)],xt);var St=C`
  :host {
    width: 100%;
  }

  wui-flex {
    width: 100%;
  }

  .contentContainer {
    max-height: 280px;
    overflow: scroll;
    scrollbar-width: none;
  }

  .contentContainer::-webkit-scrollbar {
    display: none;
  }
`,Ct=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},wt=class extends g{constructor(){super(),this.unsubscribe=[],this.tokenBalance=p.getAccountData()?.tokenBalance,this.remoteFeatures=i.state.remoteFeatures,this.unsubscribe.push(p.subscribeChainProp(`accountState`,e=>{this.tokenBalance=e?.tokenBalance}),i.subscribeKey(`remoteFeatures`,e=>{this.remoteFeatures=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return S`${this.tokenTemplate()}`}tokenTemplate(){return this.tokenBalance&&this.tokenBalance?.length>0?S`<wui-flex class="contentContainer" flexDirection="column" gap="2">
        ${this.tokenItemTemplate()}
      </wui-flex>`:S` <wui-flex flexDirection="column">
      ${this.onRampTemplate()}
      <wui-list-description
        @click=${this.onReceiveClick.bind(this)}
        text="Receive funds"
        description="Scan the QR code and receive funds"
        icon="qrCode"
        iconColor="fg-200"
        iconBackgroundColor="fg-200"
        data-testid="w3m-account-receive-button"
      ></wui-list-description
    ></wui-flex>`}onRampTemplate(){return this.remoteFeatures?.onramp?S`<wui-list-description
        @click=${this.onBuyClick.bind(this)}
        text="Buy Crypto"
        description="Easy with card or bank account"
        icon="card"
        iconColor="success-100"
        iconBackgroundColor="success-100"
        tag="popular"
        data-testid="w3m-account-onramp-button"
      ></wui-list-description>`:S``}tokenItemTemplate(){return this.tokenBalance?.map(e=>S`<wui-list-token
          tokenName=${e.name}
          tokenImageUrl=${e.iconUrl}
          tokenAmount=${e.quantity.numeric}
          tokenValue=${e.value}
          tokenCurrency=${e.symbol}
        ></wui-list-token>`)}onReceiveClick(){l.push(`WalletReceive`)}onBuyClick(){r.sendEvent({type:`track`,event:`SELECT_BUY_CRYPTO`,properties:{isSmartAccount:oe(p.state.activeChain)===ee.ACCOUNT_TYPES.SMART_ACCOUNT}}),l.push(`OnRampProviders`)}};wt.styles=St,Ct([k()],wt.prototype,`tokenBalance`,void 0),Ct([k()],wt.prototype,`remoteFeatures`,void 0),wt=Ct([x(`w3m-account-tokens-widget`)],wt);var Tt=v`
  wui-flex {
    width: 100%;
  }

  wui-promo {
    position: absolute;
    top: -32px;
  }

  wui-profile-button {
    margin-top: calc(-1 * ${({spacing:e})=>e[4]});
  }

  wui-promo + wui-profile-button {
    margin-top: ${({spacing:e})=>e[4]};
  }

  wui-tabs {
    width: 100%;
  }

  .contentContainer {
    height: 280px;
  }

  .contentContainer > wui-icon-box {
    width: 40px;
    height: 40px;
    border-radius: ${({borderRadius:e})=>e[3]};
  }

  .contentContainer > .textContent {
    width: 65%;
  }
`,R=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},z=class extends g{constructor(){super(...arguments),this.unsubscribe=[],this.network=p.state.activeCaipNetwork,this.profileName=p.getAccountData()?.profileName,this.address=p.getAccountData()?.address,this.currentTab=p.getAccountData()?.currentTab,this.tokenBalance=p.getAccountData()?.tokenBalance,this.features=i.state.features,this.namespace=p.state.activeChain,this.activeConnectorIds=d.state.activeConnectorIds,this.remoteFeatures=i.state.remoteFeatures}firstUpdated(){p.fetchTokenBalance(),this.unsubscribe.push(p.subscribeChainProp(`accountState`,e=>{e?.address?(this.address=e.address,this.profileName=e.profileName,this.currentTab=e.currentTab,this.tokenBalance=e.tokenBalance):m.close()}),d.subscribeKey(`activeConnectorIds`,e=>{this.activeConnectorIds=e}),p.subscribeKey(`activeChain`,e=>this.namespace=e),p.subscribeKey(`activeCaipNetwork`,e=>this.network=e),i.subscribeKey(`features`,e=>this.features=e),i.subscribeKey(`remoteFeatures`,e=>this.remoteFeatures=e)),this.watchSwapValues()}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),clearInterval(this.watchTokenBalance)}render(){if(!this.address)throw Error(`w3m-account-features-widget: No account provided`);if(!this.namespace)return null;let e=this.activeConnectorIds[this.namespace],t=e?d.getConnectorById(e):void 0,{icon:n,iconSize:r}=this.getAuthData();return S`<wui-flex
      flexDirection="column"
      .padding=${[`0`,`3`,`4`,`3`]}
      alignItems="center"
      gap="4"
      data-testid="w3m-account-wallet-features-widget"
    >
      <wui-flex flexDirection="column" justifyContent="center" alignItems="center" gap="2">
        <wui-wallet-switch
          profileName=${this.profileName}
          address=${this.address}
          icon=${n}
          iconSize=${r}
          alt=${t?.name}
          @click=${this.onGoToProfileWalletsView.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>

        ${this.tokenBalanceTemplate()}
      </wui-flex>
      ${this.orderedWalletFeatures()} ${this.tabsTemplate()} ${this.listContentTemplate()}
    </wui-flex>`}orderedWalletFeatures(){let e=this.features?.walletFeaturesOrder||f.DEFAULT_FEATURES.walletFeaturesOrder;if(e.every(e=>e===`send`||e===`receive`?!this.features?.[e]:e===`swaps`||e===`onramp`?!this.remoteFeatures?.[e]:!0))return null;let t=e.map(e=>e===`receive`||e===`onramp`?`fund`:e);return S`<wui-flex gap="2">
      ${[...new Set(t)].map(e=>{switch(e){case`fund`:return this.fundWalletTemplate();case`swaps`:return this.swapsTemplate();case`send`:return this.sendTemplate();default:return null}})}
    </wui-flex>`}fundWalletTemplate(){if(!this.namespace)return null;let e=f.ONRAMP_SUPPORTED_CHAIN_NAMESPACES.includes(this.namespace),t=this.features?.receive,n=this.remoteFeatures?.onramp&&e,r=T.isPayWithExchangeEnabled();return!n&&!t&&!r?null:S`
      <w3m-tooltip-trigger text="Fund wallet">
        <wui-button
          data-testid="wallet-features-fund-wallet-button"
          @click=${this.onFundWalletClick.bind(this)}
          variant="accent-secondary"
          size="lg"
          fullWidth
        >
          <wui-icon name="dollar"></wui-icon>
        </wui-button>
      </w3m-tooltip-trigger>
    `}swapsTemplate(){let e=this.remoteFeatures?.swaps,t=p.state.activeChain===w.CHAIN.EVM;return!e||!t?null:S`
      <w3m-tooltip-trigger text="Swap">
        <wui-button
          fullWidth
          data-testid="wallet-features-swaps-button"
          @click=${this.onSwapClick.bind(this)}
          variant="accent-secondary"
          size="lg"
        >
          <wui-icon name="recycleHorizontal"></wui-icon>
        </wui-button>
      </w3m-tooltip-trigger>
    `}sendTemplate(){let e=this.features?.send,t=p.state.activeChain,n=f.SEND_SUPPORTED_NAMESPACES.includes(t);return!e||!n?null:S`
      <w3m-tooltip-trigger text="Send">
        <wui-button
          fullWidth
          data-testid="wallet-features-send-button"
          @click=${this.onSendClick.bind(this)}
          variant="accent-secondary"
          size="lg"
        >
          <wui-icon name="send"></wui-icon>
        </wui-button>
      </w3m-tooltip-trigger>
    `}watchSwapValues(){this.watchTokenBalance=setInterval(()=>p.fetchTokenBalance(e=>this.onTokenBalanceError(e)),1e4)}onTokenBalanceError(e){e instanceof Error&&e.cause instanceof Response&&e.cause.status===w.HTTP_STATUS_CODES.SERVICE_UNAVAILABLE&&clearInterval(this.watchTokenBalance)}listContentTemplate(){return this.currentTab===0?S`<w3m-account-tokens-widget></w3m-account-tokens-widget>`:this.currentTab===1?S`<w3m-account-activity-widget></w3m-account-activity-widget>`:S`<w3m-account-tokens-widget></w3m-account-tokens-widget>`}tokenBalanceTemplate(){if(this.tokenBalance&&this.tokenBalance?.length>=0){let e=a.calculateBalance(this.tokenBalance),{dollars:t=`0`,pennies:n=`00`}=a.formatTokenBalance(e);return S`<wui-balance dollars=${t} pennies=${n}></wui-balance>`}return S`<wui-balance dollars="0" pennies="00"></wui-balance>`}tabsTemplate(){let e=Ce.getTabsByNamespace(p.state.activeChain);return e.length===0?null:S`<wui-tabs
      .onTabChange=${this.onTabChange.bind(this)}
      .activeTab=${this.currentTab}
      .tabs=${e}
    ></wui-tabs>`}onTabChange(e){p.setAccountProp(`currentTab`,e,this.namespace)}onFundWalletClick(){l.push(`FundWallet`)}onSwapClick(){this.network?.caipNetworkId&&!f.SWAP_SUPPORTED_NETWORKS.includes(this.network?.caipNetworkId)?l.push(`UnsupportedChain`,{swapUnsupportedChain:!0}):(r.sendEvent({type:`track`,event:`OPEN_SWAP`,properties:{network:this.network?.caipNetworkId||``,isSmartAccount:oe(p.state.activeChain)===ee.ACCOUNT_TYPES.SMART_ACCOUNT}}),l.push(`Swap`))}getAuthData(){let e=o.getConnectedSocialProvider(),n=o.getConnectedSocialUsername(),r=d.getAuthConnector()?.provider.getEmail()??``;return{name:t.getAuthName({email:r,socialUsername:n,socialProvider:e}),icon:e??`mail`,iconSize:e?`xl`:`md`}}onGoToProfileWalletsView(){l.push(`ProfileWallets`)}onSendClick(){r.sendEvent({type:`track`,event:`OPEN_SEND`,properties:{network:this.network?.caipNetworkId||``,isSmartAccount:oe(p.state.activeChain)===ee.ACCOUNT_TYPES.SMART_ACCOUNT}}),l.push(`WalletSend`)}};z.styles=Tt,R([k()],z.prototype,`watchTokenBalance`,void 0),R([k()],z.prototype,`network`,void 0),R([k()],z.prototype,`profileName`,void 0),R([k()],z.prototype,`address`,void 0),R([k()],z.prototype,`currentTab`,void 0),R([k()],z.prototype,`tokenBalance`,void 0),R([k()],z.prototype,`features`,void 0),R([k()],z.prototype,`namespace`,void 0),R([k()],z.prototype,`activeConnectorIds`,void 0),R([k()],z.prototype,`remoteFeatures`,void 0),z=R([x(`w3m-account-wallet-features-widget`)],z);var Et=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Dt=class extends g{constructor(){super(),this.unsubscribe=[],this.namespace=p.state.activeChain,this.unsubscribe.push(p.subscribeKey(`activeChain`,e=>{this.namespace=e}))}render(){if(!this.namespace)return null;let e=d.getConnectorId(this.namespace);return S`
      ${d.getAuthConnector()&&e===w.CONNECTOR_ID.AUTH?this.walletFeaturesTemplate():this.defaultTemplate()}
    `}walletFeaturesTemplate(){return S`<w3m-account-wallet-features-widget></w3m-account-wallet-features-widget>`}defaultTemplate(){return S`<w3m-account-default-widget></w3m-account-default-widget>`}};Et([k()],Dt.prototype,`namespace`,void 0),Dt=Et([x(`w3m-account-view`)],Dt);var Ot=v`
  wui-image {
    width: 24px;
    height: 24px;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  wui-image,
  .icon-box {
    width: 32px;
    height: 32px;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  wui-icon:not(.custom-icon, .icon-badge) {
    cursor: pointer;
  }

  .icon-box {
    position: relative;
    border-radius: ${({borderRadius:e})=>e[2]};
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  .icon-badge {
    position: absolute;
    top: 18px;
    left: 23px;
    z-index: 3;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
    border-radius: 50%;
    padding: ${({spacing:e})=>e[`01`]};
  }

  .icon-badge {
    width: 8px;
    height: 8px;
  }
`,B=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},V=class extends g{constructor(){super(...arguments),this.address=``,this.profileName=``,this.content=[],this.alt=``,this.imageSrc=``,this.icon=void 0,this.iconSize=`md`,this.iconBadge=void 0,this.iconBadgeSize=`md`,this.buttonVariant=`neutral-primary`,this.enableMoreButton=!1,this.charsStart=4,this.charsEnd=6}render(){return S`
      <wui-flex flexDirection="column" rowgap="2">
        ${this.topTemplate()} ${this.bottomTemplate()}
      </wui-flex>
    `}topTemplate(){return S`
      <wui-flex alignItems="flex-start" justifyContent="space-between">
        ${this.imageOrIconTemplate()}
        <wui-icon-link
          variant="secondary"
          size="md"
          icon="copy"
          @click=${this.dispatchCopyEvent}
        ></wui-icon-link>
        <wui-icon-link
          variant="secondary"
          size="md"
          icon="externalLink"
          @click=${this.dispatchExternalLinkEvent}
        ></wui-icon-link>
        ${this.enableMoreButton?S`<wui-icon-link
              variant="secondary"
              size="md"
              icon="threeDots"
              @click=${this.dispatchMoreButtonEvent}
              data-testid="wui-active-profile-wallet-item-more-button"
            ></wui-icon-link>`:null}
      </wui-flex>
    `}bottomTemplate(){return S` <wui-flex flexDirection="column">${this.contentTemplate()}</wui-flex> `}imageOrIconTemplate(){return this.icon?S`
        <wui-flex flexGrow="1" alignItems="center">
          <wui-flex alignItems="center" justifyContent="center" class="icon-box">
            <wui-icon size="lg" color="default" name=${this.icon} class="custom-icon"></wui-icon>

            ${this.iconBadge?S`<wui-icon
                  color="accent-primary"
                  size="inherit"
                  name=${this.iconBadge}
                  class="icon-badge"
                ></wui-icon>`:null}
          </wui-flex>
        </wui-flex>
      `:S`
      <wui-flex flexGrow="1" alignItems="center">
        <wui-image objectFit="contain" src=${this.imageSrc} alt=${this.alt}></wui-image>
      </wui-flex>
    `}contentTemplate(){return this.content.length===0?null:S`
      <wui-flex flexDirection="column" rowgap="3">
        ${this.content.map(e=>this.labelAndTagTemplate(e))}
      </wui-flex>
    `}labelAndTagTemplate({address:e,profileName:t,label:n,description:r,enableButton:i,buttonType:a,buttonLabel:o,buttonVariant:s,tagVariant:c,tagLabel:l,alignItems:u=`flex-end`}){return S`
      <wui-flex justifyContent="space-between" alignItems=${u} columngap="1">
        <wui-flex flexDirection="column" rowgap="01">
          ${n?S`<wui-text variant="sm-medium" color="secondary">${n}</wui-text>`:null}

          <wui-flex alignItems="center" columngap="1">
            <wui-text variant="md-regular" color="primary">
              ${b.getTruncateString({string:t||e,charsStart:t?16:this.charsStart,charsEnd:t?0:this.charsEnd,truncate:t?`end`:`middle`})}
            </wui-text>

            ${c&&l?S`<wui-tag variant=${c} size="sm">${l}</wui-tag>`:null}
          </wui-flex>

          ${r?S`<wui-text variant="sm-regular" color="secondary">${r}</wui-text>`:null}
        </wui-flex>

        ${i?this.buttonTemplate({buttonType:a,buttonLabel:o,buttonVariant:s}):null}
      </wui-flex>
    `}buttonTemplate({buttonType:e,buttonLabel:t,buttonVariant:n}){return S`
      <wui-button
        size="sm"
        variant=${n}
        @click=${e===`disconnect`?this.dispatchDisconnectEvent.bind(this):this.dispatchSwitchEvent.bind(this)}
        data-testid=${e===`disconnect`?`wui-active-profile-wallet-item-disconnect-button`:`wui-active-profile-wallet-item-switch-button`}
      >
        ${t}
      </wui-button>
    `}dispatchDisconnectEvent(){this.dispatchEvent(new CustomEvent(`disconnect`,{bubbles:!0,composed:!0}))}dispatchSwitchEvent(){this.dispatchEvent(new CustomEvent(`switch`,{bubbles:!0,composed:!0}))}dispatchExternalLinkEvent(){this.dispatchEvent(new CustomEvent(`externalLink`,{bubbles:!0,composed:!0}))}dispatchMoreButtonEvent(){this.dispatchEvent(new CustomEvent(`more`,{bubbles:!0,composed:!0}))}dispatchCopyEvent(){this.dispatchEvent(new CustomEvent(`copy`,{bubbles:!0,composed:!0}))}};V.styles=[y,_,Ot],B([D()],V.prototype,`address`,void 0),B([D()],V.prototype,`profileName`,void 0),B([D({type:Array})],V.prototype,`content`,void 0),B([D()],V.prototype,`alt`,void 0),B([D()],V.prototype,`imageSrc`,void 0),B([D()],V.prototype,`icon`,void 0),B([D()],V.prototype,`iconSize`,void 0),B([D()],V.prototype,`iconBadge`,void 0),B([D()],V.prototype,`iconBadgeSize`,void 0),B([D()],V.prototype,`buttonVariant`,void 0),B([D({type:Boolean})],V.prototype,`enableMoreButton`,void 0),B([D({type:Number})],V.prototype,`charsStart`,void 0),B([D({type:Number})],V.prototype,`charsEnd`,void 0),V=B([x(`wui-active-profile-wallet-item`)],V);var kt=v`
  wui-image,
  .icon-box {
    width: 32px;
    height: 32px;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  .right-icon {
    cursor: pointer;
  }

  .icon-box {
    position: relative;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  .icon-badge {
    position: absolute;
    top: 18px;
    left: 23px;
    z-index: 3;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
    border-radius: 50%;
    padding: ${({spacing:e})=>e[`01`]};
  }

  .icon-badge {
    width: 8px;
    height: 8px;
  }
`,H=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},U=class extends g{constructor(){super(...arguments),this.address=``,this.profileName=``,this.alt=``,this.buttonLabel=``,this.buttonVariant=`accent-primary`,this.imageSrc=``,this.icon=void 0,this.iconSize=`md`,this.iconBadgeSize=`md`,this.rightIcon=`signOut`,this.rightIconSize=`md`,this.loading=!1,this.charsStart=4,this.charsEnd=6}render(){return S`
      <wui-flex alignItems="center" columngap="2">
        ${this.imageOrIconTemplate()} ${this.labelAndDescriptionTemplate()}
        ${this.buttonActionTemplate()}
      </wui-flex>
    `}imageOrIconTemplate(){return this.icon?S`
        <wui-flex alignItems="center" justifyContent="center" class="icon-box">
          <wui-flex alignItems="center" justifyContent="center" class="icon-box">
            <wui-icon size="lg" color="default" name=${this.icon} class="custom-icon"></wui-icon>

            ${this.iconBadge?S`<wui-icon
                  color="default"
                  size="inherit"
                  name=${this.iconBadge}
                  class="icon-badge"
                ></wui-icon>`:null}
          </wui-flex>
        </wui-flex>
      `:S`<wui-image objectFit="contain" src=${this.imageSrc} alt=${this.alt}></wui-image>`}labelAndDescriptionTemplate(){return S`
      <wui-flex
        flexDirection="column"
        flexGrow="1"
        justifyContent="flex-start"
        alignItems="flex-start"
      >
        <wui-text variant="lg-regular" color="primary">
          ${b.getTruncateString({string:this.profileName||this.address,charsStart:this.profileName?16:this.charsStart,charsEnd:this.profileName?0:this.charsEnd,truncate:this.profileName?`end`:`middle`})}
        </wui-text>
      </wui-flex>
    `}buttonActionTemplate(){return S`
      <wui-flex columngap="1" alignItems="center" justifyContent="center">
        <wui-button
          size="sm"
          variant=${this.buttonVariant}
          .loading=${this.loading}
          @click=${this.handleButtonClick}
          data-testid="wui-inactive-profile-wallet-item-button"
        >
          ${this.buttonLabel}
        </wui-button>

        <wui-icon-link
          variant="secondary"
          size="md"
          icon=${O(this.rightIcon)}
          class="right-icon"
          @click=${this.handleIconClick}
        ></wui-icon-link>
      </wui-flex>
    `}handleButtonClick(){this.dispatchEvent(new CustomEvent(`buttonClick`,{bubbles:!0,composed:!0}))}handleIconClick(){this.dispatchEvent(new CustomEvent(`iconClick`,{bubbles:!0,composed:!0}))}};U.styles=[y,_,kt],H([D()],U.prototype,`address`,void 0),H([D()],U.prototype,`profileName`,void 0),H([D()],U.prototype,`alt`,void 0),H([D()],U.prototype,`buttonLabel`,void 0),H([D()],U.prototype,`buttonVariant`,void 0),H([D()],U.prototype,`imageSrc`,void 0),H([D()],U.prototype,`icon`,void 0),H([D()],U.prototype,`iconSize`,void 0),H([D()],U.prototype,`iconBadge`,void 0),H([D()],U.prototype,`iconBadgeSize`,void 0),H([D()],U.prototype,`rightIcon`,void 0),H([D()],U.prototype,`rightIconSize`,void 0),H([D({type:Boolean})],U.prototype,`loading`,void 0),H([D({type:Number})],U.prototype,`charsStart`,void 0),H([D({type:Number})],U.prototype,`charsEnd`,void 0),U=H([x(`wui-inactive-profile-wallet-item`)],U);var At={getAuthData(e){let n=e.connectorId===w.CONNECTOR_ID.AUTH;if(!n)return{isAuth:!1,icon:void 0,iconSize:void 0,name:void 0};let r=e?.auth?.name??o.getConnectedSocialProvider(),i=e?.auth?.username??o.getConnectedSocialUsername(),a=d.getAuthConnector()?.provider.getEmail()??``;return{isAuth:!0,icon:r??`mail`,iconSize:r?`xl`:`md`,name:n?t.getAuthName({email:a,socialUsername:i,socialProvider:r}):void 0}}},jt=v`
  :host {
    --connect-scroll--top-opacity: 0;
    --connect-scroll--bottom-opacity: 0;
  }

  .balance-amount {
    flex: 1;
  }

  .wallet-list {
    scrollbar-width: none;
    overflow-y: scroll;
    overflow-x: hidden;
    transition: opacity ${({easings:e})=>e[`ease-out-power-1`]}
      ${({durations:e})=>e.md};
    will-change: opacity;
    mask-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, calc(1 - var(--connect-scroll--top-opacity))) 0px,
      rgba(200, 200, 200, calc(1 - var(--connect-scroll--top-opacity))) 1px,
      black 40px,
      black calc(100% - 40px),
      rgba(155, 155, 155, calc(1 - var(--connect-scroll--bottom-opacity))) calc(100% - 1px),
      rgba(0, 0, 0, calc(1 - var(--connect-scroll--bottom-opacity))) 100%
    );
  }

  .active-wallets {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  .active-wallets-box {
    height: 330px;
  }

  .empty-wallet-list-box {
    height: 400px;
  }

  .empty-box {
    width: 100%;
    padding: ${({spacing:e})=>e[4]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-separator {
    margin: ${({spacing:e})=>e[2]} 0 ${({spacing:e})=>e[2]} 0;
  }

  .active-connection {
    padding: ${({spacing:e})=>e[2]};
  }

  .recent-connection {
    padding: ${({spacing:e})=>e[2]} 0 ${({spacing:e})=>e[2]} 0;
  }

  @media (max-width: 430px) {
    .active-wallets-box,
    .empty-wallet-list-box {
      height: auto;
      max-height: clamp(360px, 470px, 80vh);
    }
  }
`,W=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},G={ADDRESS_DISPLAY:{START:4,END:6},BADGE:{SIZE:`md`,ICON:`lightbulb`},SCROLL_THRESHOLD:50,OPACITY_RANGE:[0,1]},Mt={eip155:`ethereum`,solana:`solana`,bip122:`bitcoin`,ton:`ton`,tron:`tron`},Nt=[{namespace:`eip155`,icon:Mt.eip155,label:`EVM`},{namespace:`solana`,icon:Mt.solana,label:`Solana`},{namespace:`bip122`,icon:Mt.bip122,label:`Bitcoin`},{namespace:`ton`,icon:Mt.ton,label:`Ton`},{namespace:`tron`,icon:Mt.tron,label:`Tron`}],Pt={eip155:{title:`Add EVM Wallet`,description:`Add your first EVM wallet`},solana:{title:`Add Solana Wallet`,description:`Add your first Solana wallet`},bip122:{title:`Add Bitcoin Wallet`,description:`Add your first Bitcoin wallet`},ton:{title:`Add TON Wallet`,description:`Add your first TON wallet`},tron:{title:`Add TRON Wallet`,description:`Add your first TRON wallet`}},K=class extends g{constructor(){super(),this.unsubscribers=[],this.currentTab=0,this.namespace=p.state.activeChain,this.namespaces=Array.from(p.state.chains.keys()),this.caipAddress=void 0,this.profileName=void 0,this.activeConnectorIds=d.state.activeConnectorIds,this.lastSelectedAddress=``,this.lastSelectedConnectorId=``,this.isSwitching=!1,this.caipNetwork=p.state.activeCaipNetwork,this.user=p.getAccountData()?.user,this.remoteFeatures=i.state.remoteFeatures,this.currentTab=this.namespace?this.namespaces.indexOf(this.namespace):0,this.caipAddress=p.getAccountData(this.namespace)?.caipAddress,this.profileName=p.getAccountData(this.namespace)?.profileName,this.unsubscribers.push(h.subscribeKey(`connections`,()=>this.onConnectionsChange()),h.subscribeKey(`recentConnections`,()=>this.requestUpdate()),d.subscribeKey(`activeConnectorIds`,e=>{this.activeConnectorIds=e}),p.subscribeKey(`activeCaipNetwork`,e=>this.caipNetwork=e),p.subscribeChainProp(`accountState`,e=>{this.user=e?.user}),i.subscribeKey(`remoteFeatures`,e=>this.remoteFeatures=e)),this.chainListener=p.subscribeChainProp(`accountState`,e=>{this.caipAddress=e?.caipAddress,this.profileName=e?.profileName},this.namespace)}disconnectedCallback(){this.unsubscribers.forEach(e=>e()),this.resizeObserver?.disconnect(),this.removeScrollListener(),this.chainListener?.()}firstUpdated(){let e=this.shadowRoot?.querySelector(`.wallet-list`);if(!e)return;let t=()=>this.updateScrollOpacity(e);requestAnimationFrame(t),e.addEventListener(`scroll`,t),this.resizeObserver=new ResizeObserver(t),this.resizeObserver.observe(e),t()}render(){let e=this.namespace;if(!e)throw Error(`Namespace is not set`);return S`
      <wui-flex flexDirection="column" .padding=${[`0`,`4`,`4`,`4`]} gap="4">
        ${this.renderTabs()} ${this.renderHeader(e)} ${this.renderConnections(e)}
        ${this.renderAddConnectionButton(e)}
      </wui-flex>
    `}renderTabs(){let e=this.namespaces.map(e=>Nt.find(t=>t.namespace===e)).filter(Boolean);return e.length>1?S`
        <wui-tabs
          .onTabChange=${e=>this.handleTabChange(e)}
          .activeTab=${this.currentTab}
          .tabs=${e}
        ></wui-tabs>
      `:null}renderHeader(e){let t=this.getActiveConnections(e).flatMap(({accounts:e})=>e).length+ +!!this.caipAddress;return S`
      <wui-flex alignItems="center" columngap="1">
        <wui-icon
          size="sm"
          name=${Mt[e]??Mt.eip155}
        ></wui-icon>
        <wui-text color="secondary" variant="lg-regular"
          >${t>1?`Wallets`:`Wallet`}</wui-text
        >
        <wui-text
          color="primary"
          variant="lg-regular"
          class="balance-amount"
          data-testid="balance-amount"
        >
          ${t}
        </wui-text>
        <wui-link
          color="secondary"
          variant="secondary"
          @click=${()=>h.disconnect({namespace:e})}
          ?disabled=${!this.hasAnyConnections(e)}
          data-testid="disconnect-all-button"
        >
          Disconnect All
        </wui-link>
      </wui-flex>
    `}renderConnections(e){let t=this.hasAnyConnections(e);return S`
      <wui-flex flexDirection="column" class=${ve({"wallet-list":!0,"active-wallets-box":t,"empty-wallet-list-box":!t})} rowgap="3">
        ${t?this.renderActiveConnections(e):this.renderEmptyState(e)}
      </wui-flex>
    `}renderActiveConnections(e){let t=this.getActiveConnections(e),n=this.activeConnectorIds[e];return S`
      ${this.getPlainAddress()||n||t.length>0?S`<wui-flex
            flexDirection="column"
            .padding=${[`4`,`0`,`4`,`0`]}
            class="active-wallets"
          >
            ${this.renderActiveProfile(e)} ${this.renderActiveConnectionsList(e)}
          </wui-flex>`:null}
      ${this.renderRecentConnections(e)}
    `}renderActiveProfile(e){let t=this.activeConnectorIds[e];if(!t)return null;let{connections:n}=ae.getConnectionsData(e),r=d.getConnectorById(t),i=s.getConnectorImage(r),a=this.getPlainAddress();if(!a)return null;let o=e===w.CHAIN.BITCOIN,c=At.getAuthData({connectorId:t,accounts:[]}),l=this.getActiveConnections(e).flatMap(e=>e.accounts).length>0,u=n.find(e=>e.connectorId===t),ee=u?.accounts.filter(e=>!E.isLowerCaseMatch(e.address,a));return S`
      <wui-flex flexDirection="column" .padding=${[`0`,`4`,`0`,`4`]}>
        <wui-active-profile-wallet-item
          address=${a}
          alt=${r?.name}
          .content=${this.getProfileContent({address:a,connections:n,connectorId:t,namespace:e})}
          .charsStart=${G.ADDRESS_DISPLAY.START}
          .charsEnd=${G.ADDRESS_DISPLAY.END}
          .icon=${c.icon}
          .iconSize=${c.iconSize}
          .iconBadge=${this.isSmartAccount(a)?G.BADGE.ICON:void 0}
          .iconBadgeSize=${this.isSmartAccount(a)?G.BADGE.SIZE:void 0}
          imageSrc=${i}
          ?enableMoreButton=${c.isAuth}
          @copy=${()=>this.handleCopyAddress(a)}
          @disconnect=${()=>this.handleDisconnect(e,t)}
          @switch=${()=>{o&&u&&ee?.[0]&&this.handleSwitchWallet(u,ee[0].address,e)}}
          @externalLink=${()=>this.handleExternalLink(a)}
          @more=${()=>this.handleMore()}
          data-testid="wui-active-profile-wallet-item"
        ></wui-active-profile-wallet-item>
        ${l?S`<wui-separator></wui-separator>`:null}
      </wui-flex>
    `}renderActiveConnectionsList(e){let t=this.getActiveConnections(e);return t.length===0?null:S`
      <wui-flex flexDirection="column" .padding=${[`0`,`2`,`0`,`2`]}>
        ${this.renderConnectionList(t,!1,e)}
      </wui-flex>
    `}renderRecentConnections(e){let{recentConnections:t}=ae.getConnectionsData(e);return t.flatMap(e=>e.accounts).length===0?null:S`
      <wui-flex flexDirection="column" .padding=${[`0`,`2`,`0`,`2`]} rowGap="2">
        <wui-text color="secondary" variant="sm-medium" data-testid="recently-connected-text"
          >RECENTLY CONNECTED</wui-text
        >
        <wui-flex flexDirection="column" .padding=${[`0`,`2`,`0`,`2`]}>
          ${this.renderConnectionList(t,!0,e)}
        </wui-flex>
      </wui-flex>
    `}renderConnectionList(e,t,n){return e.filter(e=>e.accounts.length>0).map((e,r)=>{let i=d.getConnectorById(e.connectorId),a=s.getConnectorImage(i)??``,o=At.getAuthData(e);return e.accounts.map((i,s)=>{let c=r!==0||s!==0,l=this.isAccountLoading(e.connectorId,i.address);return S`
            <wui-flex flexDirection="column">
              ${c?S`<wui-separator></wui-separator>`:null}
              <wui-inactive-profile-wallet-item
                address=${i.address}
                alt=${e.connectorId}
                buttonLabel=${t?`Connect`:`Switch`}
                buttonVariant=${t?`neutral-secondary`:`accent-secondary`}
                rightIcon=${t?`bin`:`power`}
                rightIconSize="sm"
                class=${t?`recent-connection`:`active-connection`}
                data-testid=${t?`recent-connection`:`active-connection`}
                imageSrc=${a}
                .iconBadge=${this.isSmartAccount(i.address)?G.BADGE.ICON:void 0}
                .iconBadgeSize=${this.isSmartAccount(i.address)?G.BADGE.SIZE:void 0}
                .icon=${o.icon}
                .iconSize=${o.iconSize}
                .loading=${l}
                .showBalance=${!1}
                .charsStart=${G.ADDRESS_DISPLAY.START}
                .charsEnd=${G.ADDRESS_DISPLAY.END}
                @buttonClick=${()=>this.handleSwitchWallet(e,i.address,n)}
                @iconClick=${()=>this.handleWalletAction({connection:e,address:i.address,isRecentConnection:t,namespace:n})}
              ></wui-inactive-profile-wallet-item>
            </wui-flex>
          `})})}renderAddConnectionButton(e){if(!this.isMultiWalletEnabled()&&this.caipAddress||!this.hasAnyConnections(e))return null;let{title:t}=this.getChainLabelInfo(e);return S`
      <wui-list-item
        variant="icon"
        iconVariant="overlay"
        icon="plus"
        iconSize="sm"
        ?chevron=${!0}
        @click=${()=>this.handleAddConnection(e)}
        data-testid="add-connection-button"
      >
        <wui-text variant="md-medium" color="secondary">${t}</wui-text>
      </wui-list-item>
    `}renderEmptyState(e){let{title:t,description:n}=this.getChainLabelInfo(e);return S`
      <wui-flex alignItems="flex-start" class="empty-template" data-testid="empty-template">
        <wui-flex
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          rowgap="3"
          class="empty-box"
        >
          <wui-icon-box size="xl" icon="wallet" color="secondary"></wui-icon-box>

          <wui-flex flexDirection="column" alignItems="center" justifyContent="center" gap="1">
            <wui-text color="primary" variant="lg-regular" data-testid="empty-state-text"
              >No wallet connected</wui-text
            >
            <wui-text color="secondary" variant="md-regular" data-testid="empty-state-description"
              >${n}</wui-text
            >
          </wui-flex>

          <wui-link
            @click=${()=>this.handleAddConnection(e)}
            data-testid="empty-state-button"
            icon="plus"
          >
            ${t}
          </wui-link>
        </wui-flex>
      </wui-flex>
    `}handleTabChange(e){let t=this.namespaces[e];t&&(this.chainListener?.(),this.currentTab=this.namespaces.indexOf(t),this.namespace=t,this.caipAddress=p.getAccountData(t)?.caipAddress,this.profileName=p.getAccountData(t)?.profileName,this.chainListener=p.subscribeChainProp(`accountState`,e=>{this.caipAddress=e?.caipAddress},t))}async handleSwitchWallet(e,t,n){try{this.isSwitching=!0,this.lastSelectedConnectorId=e.connectorId,this.lastSelectedAddress=t,this.caipNetwork?.chainNamespace!==n&&e?.caipNetwork&&(d.setFilterByNamespace(n),await p.switchActiveNetwork(e?.caipNetwork)),await h.switchConnection({connection:e,address:t,namespace:n,closeModalOnConnect:!1,onChange({hasSwitchedAccount:e,hasSwitchedWallet:t}){t?c.showSuccess(`Wallet switched`):e&&c.showSuccess(`Account switched`)}})}catch{c.showError(`Failed to switch wallet`)}finally{this.isSwitching=!1}}handleWalletAction(e){let{connection:t,address:n,isRecentConnection:r,namespace:i}=e;r?(o.deleteAddressFromConnection({connectorId:t.connectorId,address:n,namespace:i}),h.syncStorageConnections(),c.showSuccess(`Wallet deleted`)):this.handleDisconnect(i,t.connectorId)}async handleDisconnect(e,t){try{await h.disconnect({id:t,namespace:e}),c.showSuccess(`Wallet disconnected`)}catch{c.showError(`Failed to disconnect wallet`)}}handleCopyAddress(e){a.copyToClopboard(e),c.showSuccess(`Address copied`)}handleMore(){l.push(`AccountSettings`)}handleExternalLink(e){let t=this.caipNetwork?.blockExplorers?.default.url;t&&a.openHref(`${t}/address/${e}`,`_blank`)}handleAddConnection(e){d.setFilterByNamespace(e),l.push(`Connect`,{addWalletForNamespace:e})}getChainLabelInfo(e){return Pt[e]??{title:`Add Wallet`,description:`Add your first wallet`}}isSmartAccount(e){if(!this.namespace)return!1;let t=this.user?.accounts?.find(e=>e.type===`smartAccount`);return t&&e?E.isLowerCaseMatch(t.address,e):!1}getPlainAddress(){return this.caipAddress?a.getPlainAddress(this.caipAddress):void 0}getActiveConnections(e){let t=this.activeConnectorIds[e],{connections:n}=ae.getConnectionsData(e),[r]=n.filter(e=>E.isLowerCaseMatch(e.connectorId,t));if(!t)return n;let i=e===w.CHAIN.BITCOIN,{address:a}=this.caipAddress?ie.parseCaipAddress(this.caipAddress):{},o=[...a?[a]:[]];return i&&r&&(o=r.accounts.map(e=>e.address)||[]),ae.excludeConnectorAddressFromConnections({connectorId:t,addresses:o,connections:n})}hasAnyConnections(e){let t=this.getActiveConnections(e),{recentConnections:n}=ae.getConnectionsData(e);return!!this.caipAddress||t.length>0||n.length>0}isAccountLoading(e,t){return E.isLowerCaseMatch(this.lastSelectedConnectorId,e)&&E.isLowerCaseMatch(this.lastSelectedAddress,t)&&this.isSwitching}getProfileContent(e){let{address:t,connections:n,connectorId:r,namespace:i}=e,[a]=n.filter(e=>E.isLowerCaseMatch(e.connectorId,r));if(i===w.CHAIN.BITCOIN&&a?.accounts.every(e=>typeof e.type==`string`))return this.getBitcoinProfileContent(a.accounts,t);let o=At.getAuthData({connectorId:r,accounts:[]});return[{address:t,tagLabel:`Active`,tagVariant:`success`,enableButton:!0,profileName:this.profileName,buttonType:`disconnect`,buttonLabel:`Disconnect`,buttonVariant:`neutral-secondary`,...o.isAuth?{description:this.isSmartAccount(t)?`Smart Account`:`EOA Account`}:{}}]}getBitcoinProfileContent(e,t){let n=e.length>1,r=this.getPlainAddress();return e.map(e=>{let i=E.isLowerCaseMatch(e.address,r),a=`PAYMENT`;return e.type===`ordinal`&&(a=`ORDINALS`),{address:e.address,tagLabel:E.isLowerCaseMatch(e.address,t)?`Active`:void 0,tagVariant:E.isLowerCaseMatch(e.address,t)?`success`:void 0,enableButton:!0,...n?{label:a,alignItems:`flex-end`,buttonType:i?`disconnect`:`switch`,buttonLabel:i?`Disconnect`:`Switch`,buttonVariant:i?`neutral-secondary`:`accent-secondary`}:{alignItems:`center`,buttonType:`disconnect`,buttonLabel:`Disconnect`,buttonVariant:`neutral-secondary`}}})}removeScrollListener(){let e=this.shadowRoot?.querySelector(`.wallet-list`);e&&e.removeEventListener(`scroll`,()=>this.handleConnectListScroll())}handleConnectListScroll(){let e=this.shadowRoot?.querySelector(`.wallet-list`);e&&this.updateScrollOpacity(e)}isMultiWalletEnabled(){return!!this.remoteFeatures?.multiWallet}updateScrollOpacity(e){e.style.setProperty(`--connect-scroll--top-opacity`,le.interpolate([0,G.SCROLL_THRESHOLD],G.OPACITY_RANGE,e.scrollTop).toString()),e.style.setProperty(`--connect-scroll--bottom-opacity`,le.interpolate([0,G.SCROLL_THRESHOLD],G.OPACITY_RANGE,e.scrollHeight-e.scrollTop-e.offsetHeight).toString())}onConnectionsChange(){if(this.isMultiWalletEnabled()&&this.namespace){let{connections:e}=ae.getConnectionsData(this.namespace);e.length===0&&l.reset(`ProfileWallets`)}this.requestUpdate()}};K.styles=jt,W([k()],K.prototype,`currentTab`,void 0),W([k()],K.prototype,`namespace`,void 0),W([k()],K.prototype,`namespaces`,void 0),W([k()],K.prototype,`caipAddress`,void 0),W([k()],K.prototype,`profileName`,void 0),W([k()],K.prototype,`activeConnectorIds`,void 0),W([k()],K.prototype,`lastSelectedAddress`,void 0),W([k()],K.prototype,`lastSelectedConnectorId`,void 0),W([k()],K.prototype,`isSwitching`,void 0),W([k()],K.prototype,`caipNetwork`,void 0),W([k()],K.prototype,`user`,void 0),W([k()],K.prototype,`remoteFeatures`,void 0),K=W([x(`w3m-profile-wallets-view`)],K);var Ft=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},It=class extends g{constructor(){super(),this.unsubscribe=[],this.activeCaipNetwork=p.state.activeCaipNetwork,this.features=i.state.features,this.remoteFeatures=i.state.remoteFeatures,this.exchangesLoading=T.state.isLoading,this.exchanges=T.state.exchanges,this.unsubscribe.push(i.subscribeKey(`features`,e=>this.features=e),i.subscribeKey(`remoteFeatures`,e=>this.remoteFeatures=e),p.subscribeKey(`activeCaipNetwork`,e=>{this.activeCaipNetwork=e,this.setDefaultPaymentAsset()}),T.subscribeKey(`isLoading`,e=>this.exchangesLoading=e),T.subscribeKey(`exchanges`,e=>this.exchanges=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}async firstUpdated(){T.isPayWithExchangeSupported()&&(await this.setDefaultPaymentAsset(),await T.fetchExchanges())}render(){return S`
      <wui-flex flexDirection="column" .padding=${[`1`,`3`,`3`,`3`]} gap="2">
        ${this.onrampTemplate()} ${this.receiveTemplate()} ${this.depositFromExchangeTemplate()}
      </wui-flex>
    `}async setDefaultPaymentAsset(){if(!this.activeCaipNetwork)return;let e=await T.getAssetsForNetwork(this.activeCaipNetwork.caipNetworkId),t=e.find(e=>e.metadata.symbol===`USDC`)||e[0];t&&T.setPaymentAsset(t)}onrampTemplate(){if(!this.activeCaipNetwork)return null;let e=this.remoteFeatures?.onramp,t=f.ONRAMP_SUPPORTED_CHAIN_NAMESPACES.includes(this.activeCaipNetwork.chainNamespace);return!e||!t?null:S`
      <wui-list-item
        @click=${this.onBuyCrypto.bind(this)}
        icon="card"
        data-testid="wallet-features-onramp-button"
      >
        <wui-text variant="lg-regular" color="primary">Buy crypto</wui-text>
      </wui-list-item>
    `}depositFromExchangeTemplate(){return!this.activeCaipNetwork||!T.isPayWithExchangeSupported()?null:S`
      <wui-list-item
        @click=${this.onDepositFromExchange.bind(this)}
        icon="arrowBottomCircle"
        data-testid="wallet-features-deposit-from-exchange-button"
        ?loading=${this.exchangesLoading}
        ?disabled=${this.exchangesLoading||!this.exchanges.length}
      >
        <wui-text variant="lg-regular" color="primary">Deposit from exchange</wui-text>
      </wui-list-item>
    `}receiveTemplate(){return this.features?.receive?S`
      <wui-list-item
        @click=${this.onReceive.bind(this)}
        icon="qrCode"
        data-testid="wallet-features-receive-button"
      >
        <wui-text variant="lg-regular" color="primary">Receive funds</wui-text>
      </wui-list-item>
    `:null}onBuyCrypto(){l.push(`OnRampProviders`)}onReceive(){l.push(`WalletReceive`)}onDepositFromExchange(){T.reset(),l.push(`PayWithExchange`,{redirectView:l.state.data?.redirectView})}};Ft([k()],It.prototype,`activeCaipNetwork`,void 0),Ft([k()],It.prototype,`features`,void 0),Ft([k()],It.prototype,`remoteFeatures`,void 0),Ft([k()],It.prototype,`exchangesLoading`,void 0),Ft([k()],It.prototype,`exchanges`,void 0),It=Ft([x(`w3m-fund-wallet-view`)],It);var Lt=v`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  label {
    position: relative;
    display: inline-block;
    user-select: none;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e[`ease-out-power-2`]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e[`ease-out-power-2`]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e[`ease-out-power-2`]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e[`ease-out-power-2`]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e[`ease-out-power-2`]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e[`ease-out-power-2`]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e[`ease-out-power-2`]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  input {
    width: 0;
    height: 0;
    opacity: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({colors:e})=>e.neutrals300};
    border-radius: ${({borderRadius:e})=>e.round};
    border: 1px solid transparent;
    will-change: border;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e[`ease-out-power-2`]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e[`ease-out-power-2`]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e[`ease-out-power-2`]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e[`ease-out-power-2`]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e[`ease-out-power-2`]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e[`ease-out-power-2`]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e[`ease-out-power-2`]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  span:before {
    content: '';
    position: absolute;
    background-color: ${({colors:e})=>e.white};
    border-radius: 50%;
  }

  /* -- Sizes --------------------------------------------------------- */
  label[data-size='lg'] {
    width: 48px;
    height: 32px;
  }

  label[data-size='md'] {
    width: 40px;
    height: 28px;
  }

  label[data-size='sm'] {
    width: 32px;
    height: 22px;
  }

  label[data-size='lg'] > span:before {
    height: 24px;
    width: 24px;
    left: 4px;
    top: 3px;
  }

  label[data-size='md'] > span:before {
    height: 20px;
    width: 20px;
    left: 4px;
    top: 3px;
  }

  label[data-size='sm'] > span:before {
    height: 16px;
    width: 16px;
    left: 3px;
    top: 2px;
  }

  /* -- Focus states --------------------------------------------------- */
  input:focus-visible:not(:checked) + span,
  input:focus:not(:checked) + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    background-color: ${({tokens:e})=>e.theme.textTertiary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  input:focus-visible:checked + span,
  input:focus:checked + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  /* -- Checked states --------------------------------------------------- */
  input:checked + span {
    background-color: ${({tokens:e})=>e.core.iconAccentPrimary};
  }

  label[data-size='lg'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='md'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='sm'] > input:checked + span:before {
    transform: translateX(calc(100% - 7px));
  }

  /* -- Hover states ------------------------------------------------------- */
  label:hover > input:not(:checked):not(:disabled) + span {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  label:hover > input:checked:not(:disabled) + span {
    background-color: ${({colors:e})=>e.accent080};
  }

  /* -- Disabled state --------------------------------------------------- */
  label:has(input:disabled) {
    pointer-events: none;
    user-select: none;
  }

  input:not(:checked):disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:checked:disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:not(:checked):disabled + span::before {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  input:checked:disabled + span::before {
    background-color: ${({tokens:e})=>e.theme.textTertiary};
  }
`,Rt=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},zt=class extends g{constructor(){super(...arguments),this.inputElementRef=Se(),this.checked=!1,this.disabled=!1,this.size=`md`}render(){return S`
      <label data-size=${this.size}>
        <input
          ${xe(this.inputElementRef)}
          type="checkbox"
          ?checked=${this.checked}
          ?disabled=${this.disabled}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `}dispatchChangeEvent(){this.dispatchEvent(new CustomEvent(`switchChange`,{detail:this.inputElementRef.value?.checked,bubbles:!0,composed:!0}))}};zt.styles=[y,_,Lt],Rt([D({type:Boolean})],zt.prototype,`checked`,void 0),Rt([D({type:Boolean})],zt.prototype,`disabled`,void 0),Rt([D()],zt.prototype,`size`,void 0),zt=Rt([x(`wui-toggle`)],zt);var Bt=v`
  :host {
    height: auto;
  }

  :host > wui-flex {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[2]} ${({spacing:e})=>e[3]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
    box-shadow: inset 0 0 0 1px ${({tokens:e})=>e.theme.foregroundPrimary};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: background-color;
    cursor: pointer;
  }

  wui-switch {
    pointer-events: none;
  }
`,Vt=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Ht=class extends g{constructor(){super(...arguments),this.checked=!1}render(){return S`
      <wui-flex>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-toggle
          ?checked=${this.checked}
          size="sm"
          @switchChange=${this.handleToggleChange.bind(this)}
        ></wui-toggle>
      </wui-flex>
    `}handleToggleChange(e){e.stopPropagation(),this.checked=e.detail,this.dispatchSwitchEvent()}dispatchSwitchEvent(){this.dispatchEvent(new CustomEvent(`certifiedSwitchChange`,{detail:this.checked,bubbles:!0,composed:!0}))}};Ht.styles=[y,_,Bt],Vt([D({type:Boolean})],Ht.prototype,`checked`,void 0),Ht=Vt([x(`wui-certified-switch`)],Ht);var Ut=v`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  wui-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.iconDefault};
    cursor: pointer;
    padding: ${({spacing:e})=>e[2]};
    background-color: transparent;
    border-radius: ${({borderRadius:e})=>e[4]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e[`ease-out-power-2`]};
  }

  @media (hover: hover) {
    wui-icon:hover {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }
`,Wt=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Gt=class extends g{constructor(){super(...arguments),this.inputComponentRef=Se(),this.inputValue=``}render(){return S`
      <wui-input-text
        ${xe(this.inputComponentRef)}
        placeholder="Search wallet"
        icon="search"
        type="search"
        enterKeyHint="search"
        size="sm"
        @inputChange=${this.onInputChange}
      >
        ${this.inputValue?S`<wui-icon
              @click=${this.clearValue}
              color="inherit"
              size="sm"
              name="close"
            ></wui-icon>`:null}
      </wui-input-text>
    `}onInputChange(e){this.inputValue=e.detail||``}clearValue(){let e=this.inputComponentRef.value?.inputElementRef.value;e&&(e.value=``,this.inputValue=``,e.focus(),e.dispatchEvent(new Event(`input`)))}};Gt.styles=[y,Ut],Wt([D()],Gt.prototype,`inputValue`,void 0),Gt=Wt([x(`wui-search-bar`)],Gt);var Kt=v`
  :host {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 104px;
    width: 104px;
    row-gap: ${({spacing:e})=>e[2]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    position: relative;
  }

  wui-shimmer[data-type='network'] {
    border: none;
    -webkit-clip-path: var(--apkt-path-network);
    clip-path: var(--apkt-path-network);
  }

  svg {
    position: absolute;
    width: 48px;
    height: 54px;
    z-index: 1;
  }

  svg > path {
    stroke: ${({tokens:e})=>e.theme.foregroundSecondary};
    stroke-width: 1px;
  }

  @media (max-width: 350px) {
    :host {
      width: 100%;
    }
  }
`,qt=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Jt=class extends g{constructor(){super(...arguments),this.type=`wallet`}render(){return S`
      ${this.shimmerTemplate()}
      <wui-shimmer width="80px" height="20px"></wui-shimmer>
    `}shimmerTemplate(){return this.type===`network`?S` <wui-shimmer data-type=${this.type} width="48px" height="54px"></wui-shimmer>
        ${ye}`:S`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}};Jt.styles=[y,_,Kt],qt([D()],Jt.prototype,`type`,void 0),Jt=qt([x(`wui-card-select-loader`)],Jt);var Yt=C`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`,q=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},J=class extends g{render(){return this.style.cssText=`
      grid-template-rows: ${this.gridTemplateRows};
      grid-template-columns: ${this.gridTemplateColumns};
      justify-items: ${this.justifyItems};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      align-content: ${this.alignContent};
      column-gap: ${this.columnGap&&`var(--apkt-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--apkt-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--apkt-spacing-${this.gap})`};
      padding-top: ${this.padding&&b.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&b.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&b.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&b.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&b.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&b.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&b.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&b.getSpacingStyles(this.margin,3)};
    `,S`<slot></slot>`}};J.styles=[y,Yt],q([D()],J.prototype,`gridTemplateRows`,void 0),q([D()],J.prototype,`gridTemplateColumns`,void 0),q([D()],J.prototype,`justifyItems`,void 0),q([D()],J.prototype,`alignItems`,void 0),q([D()],J.prototype,`justifyContent`,void 0),q([D()],J.prototype,`alignContent`,void 0),q([D()],J.prototype,`columnGap`,void 0),q([D()],J.prototype,`rowGap`,void 0),q([D()],J.prototype,`gap`,void 0),q([D()],J.prototype,`padding`,void 0),q([D()],J.prototype,`margin`,void 0),J=q([x(`wui-grid`)],J);var Xt=v`
  button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    width: 104px;
    row-gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[0]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: clamp(0px, ${({borderRadius:e})=>e[4]}, 20px);
    transition:
      color ${({durations:e})=>e.lg} ${({easings:e})=>e[`ease-out-power-1`]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e[`ease-out-power-1`]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e[`ease-out-power-1`]};
    will-change: background-color, color, border-radius;
    outline: none;
    border: none;
  }

  button > wui-flex > wui-text {
    color: ${({tokens:e})=>e.theme.textPrimary};
    max-width: 86px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
  }

  button > wui-flex > wui-text.certified {
    max-width: 66px;
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  button:disabled > wui-flex > wui-text {
    color: ${({tokens:e})=>e.core.glass010};
  }

  [data-selected='true'] {
    background-color: ${({colors:e})=>e.accent020};
  }

  @media (hover: hover) and (pointer: fine) {
    [data-selected='true']:hover:enabled {
      background-color: ${({colors:e})=>e.accent010};
    }
  }

  [data-selected='true']:active:enabled {
    background-color: ${({colors:e})=>e.accent010};
  }

  @media (max-width: 350px) {
    button {
      width: 100%;
    }
  }
`,Zt=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Y=class extends g{constructor(){super(),this.observer=new IntersectionObserver(()=>void 0),this.visible=!1,this.imageSrc=void 0,this.imageLoading=!1,this.isImpressed=!1,this.explorerId=``,this.walletQuery=``,this.certified=!1,this.displayIndex=0,this.wallet=void 0,this.observer=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting?(this.visible=!0,this.fetchImageSrc(),this.sendImpressionEvent()):this.visible=!1})},{threshold:.01})}firstUpdated(){this.observer.observe(this)}disconnectedCallback(){this.observer.disconnect()}render(){let e=this.wallet?.badge_type===`certified`;return S`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="1">
          <wui-text
            variant="md-regular"
            color="inherit"
            class=${O(e?`certified`:void 0)}
            >${this.wallet?.name}</wui-text
          >
          ${e?S`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>`:null}
        </wui-flex>
      </button>
    `}imageTemplate(){return!this.visible&&!this.imageSrc||this.imageLoading?this.shimmerTemplate():S`
      <wui-wallet-image
        size="lg"
        imageSrc=${O(this.imageSrc)}
        name=${O(this.wallet?.name)}
        .installed=${this.wallet?.installed??!1}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `}shimmerTemplate(){return S`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}async fetchImageSrc(){this.wallet&&(this.imageSrc=s.getWalletImage(this.wallet),!this.imageSrc&&(this.imageLoading=!0,this.imageSrc=await s.fetchWalletImage(this.wallet.image_id),this.imageLoading=!1))}sendImpressionEvent(){!this.wallet||this.isImpressed||(this.isImpressed=!0,r.sendWalletImpressionEvent({name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.explorerId,view:l.state.view,query:this.walletQuery,certified:this.certified,displayIndex:this.displayIndex}))}};Y.styles=Xt,Zt([k()],Y.prototype,`visible`,void 0),Zt([k()],Y.prototype,`imageSrc`,void 0),Zt([k()],Y.prototype,`imageLoading`,void 0),Zt([k()],Y.prototype,`isImpressed`,void 0),Zt([D()],Y.prototype,`explorerId`,void 0),Zt([D()],Y.prototype,`walletQuery`,void 0),Zt([D()],Y.prototype,`certified`,void 0),Zt([D()],Y.prototype,`displayIndex`,void 0),Zt([D({type:Object})],Y.prototype,`wallet`,void 0),Y=Zt([x(`w3m-all-wallets-list-item`)],Y);var Qt=v`
  wui-grid {
    max-height: clamp(360px, 400px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  w3m-all-wallets-list-item {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e[`ease-inout-power-2`]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  wui-loading-spinner {
    padding-top: ${({spacing:e})=>e[4]};
    padding-bottom: ${({spacing:e})=>e[4]};
    justify-content: center;
    grid-column: 1 / span 4;
  }
`,$t=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},en=`local-paginator`,tn=class extends g{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.loading=!u.state.wallets.length,this.wallets=u.state.wallets,this.mobileFullScreen=i.state.enableMobileFullScreen,this.unsubscribe.push(u.subscribeKey(`wallets`,e=>this.wallets=e))}firstUpdated(){this.mobileFullScreen&&this.setAttribute(`data-mobile-fullscreen`,`true`),this.initialFetch(),this.createPaginationObserver()}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.paginationObserver?.disconnect()}render(){return S`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${[`0`,`3`,`3`,`3`]}
        gap="2"
        justifyContent="space-between"
      >
        ${this.loading?this.shimmerTemplate(16):this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `}async initialFetch(){this.loading=!0;let e=this.shadowRoot?.querySelector(`wui-grid`);e&&(await u.fetchWalletsByPage({page:1}),await e.animate([{opacity:1},{opacity:0}],{duration:200,fill:`forwards`,easing:`ease`}).finished,this.loading=!1,e.animate([{opacity:0},{opacity:1}],{duration:200,fill:`forwards`,easing:`ease`}))}shimmerTemplate(e,t){return[...Array(e)].map(()=>S`
        <wui-card-select-loader type="wallet" id=${O(t)}></wui-card-select-loader>
      `)}walletsTemplate(){return se.getWalletConnectWallets(this.wallets).map((e,t)=>S`
        <w3m-all-wallets-list-item
          data-testid="wallet-search-item-${e.id}"
          @click=${()=>this.onConnectWallet(e)}
          .wallet=${e}
          explorerId=${e.id}
          certified=${this.badge===`certified`}
          displayIndex=${t}
        ></w3m-all-wallets-list-item>
      `)}paginationLoaderTemplate(){let{wallets:e,recommended:t,featured:n,count:r,mobileFilteredOutWalletsLength:i}=u.state,a=window.innerWidth<352?3:4,o=e.length+t.length,s=Math.ceil(o/a)*a-o+a;return s-=e.length?n.length%a:0,r===0&&n.length>0?null:r===0||[...n,...e,...t].length<r-(i??0)?this.shimmerTemplate(s,en):null}createPaginationObserver(){let e=this.shadowRoot?.querySelector(`#${en}`);e&&(this.paginationObserver=new IntersectionObserver(([e])=>{if(e?.isIntersecting&&!this.loading){let{page:e,count:t,wallets:n}=u.state;n.length<t&&u.fetchWalletsByPage({page:e+1})}}),this.paginationObserver.observe(e))}onConnectWallet(e){d.selectWalletConnector(e)}};tn.styles=Qt,$t([k()],tn.prototype,`loading`,void 0),$t([k()],tn.prototype,`wallets`,void 0),$t([k()],tn.prototype,`badge`,void 0),$t([k()],tn.prototype,`mobileFullScreen`,void 0),tn=$t([x(`w3m-all-wallets-list`)],tn);var nn=C`
  wui-grid,
  wui-loading-spinner,
  wui-flex {
    height: 360px;
  }

  wui-grid {
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
    height: auto;
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`,rn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},an=class extends g{constructor(){super(...arguments),this.prevQuery=``,this.prevBadge=void 0,this.loading=!0,this.mobileFullScreen=i.state.enableMobileFullScreen,this.query=``}render(){return this.mobileFullScreen&&this.setAttribute(`data-mobile-fullscreen`,`true`),this.onSearch(),this.loading?S`<wui-loading-spinner color="accent-primary"></wui-loading-spinner>`:this.walletsTemplate()}async onSearch(){(this.query.trim()!==this.prevQuery.trim()||this.badge!==this.prevBadge)&&(this.prevQuery=this.query,this.prevBadge=this.badge,this.loading=!0,await u.searchWallet({search:this.query,badge:this.badge}),this.loading=!1)}walletsTemplate(){let{search:e}=u.state,t=se.markWalletsAsInstalled(e),n=se.filterWalletsByWcSupport(t);return n.length?S`
      <wui-grid
        data-testid="wallet-list"
        .padding=${[`0`,`3`,`3`,`3`]}
        rowGap="4"
        columngap="2"
        justifyContent="space-between"
      >
        ${n.map((e,t)=>S`
            <w3m-all-wallets-list-item
              @click=${()=>this.onConnectWallet(e)}
              .wallet=${e}
              data-testid="wallet-search-item-${e.id}"
              explorerId=${e.id}
              certified=${this.badge===`certified`}
              walletQuery=${this.query}
              displayIndex=${t}
            ></w3m-all-wallets-list-item>
          `)}
      </wui-grid>
    `:S`
        <wui-flex
          data-testid="no-wallet-found"
          justifyContent="center"
          alignItems="center"
          gap="3"
          flexDirection="column"
        >
          <wui-icon-box size="lg" color="default" icon="wallet"></wui-icon-box>
          <wui-text data-testid="no-wallet-found-text" color="secondary" variant="md-medium">
            No Wallet found
          </wui-text>
        </wui-flex>
      `}onConnectWallet(e){d.selectWalletConnector(e)}};an.styles=nn,rn([k()],an.prototype,`loading`,void 0),rn([k()],an.prototype,`mobileFullScreen`,void 0),rn([D()],an.prototype,`query`,void 0),rn([D()],an.prototype,`badge`,void 0),an=rn([x(`w3m-all-wallets-search`)],an);var on=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},sn=class extends g{constructor(){super(...arguments),this.search=``,this.badge=void 0,this.onDebouncedSearch=a.debounce(e=>{this.search=e})}render(){let e=this.search.length>=2;return S`
      <wui-flex .padding=${[`1`,`3`,`3`,`3`]} gap="2" alignItems="center">
        <wui-search-bar @inputChange=${this.onInputChange.bind(this)}></wui-search-bar>
        <wui-certified-switch
          ?checked=${this.badge===`certified`}
          @certifiedSwitchChange=${this.onCertifiedSwitchChange.bind(this)}
          data-testid="wui-certified-switch"
        ></wui-certified-switch>
        ${this.qrButtonTemplate()}
      </wui-flex>
      ${e||this.badge?S`<w3m-all-wallets-search
            query=${this.search}
            .badge=${this.badge}
          ></w3m-all-wallets-search>`:S`<w3m-all-wallets-list .badge=${this.badge}></w3m-all-wallets-list>`}
    `}onInputChange(e){this.onDebouncedSearch(e.detail)}onCertifiedSwitchChange(e){e.detail?(this.badge=`certified`,c.showSvg(`Only WalletConnect certified`,{icon:`walletConnectBrown`,iconColor:`accent-100`})):this.badge=void 0}qrButtonTemplate(){return a.isMobile()?S`
        <wui-icon-box
          size="xl"
          iconSize="xl"
          color="accent-primary"
          icon="qrCode"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `:null}onWalletConnectQr(){l.push(`ConnectingWalletConnect`)}};on([k()],sn.prototype,`search`,void 0),on([k()],sn.prototype,`badge`,void 0),sn=on([x(`w3m-all-wallets-view`)],sn);var cn=v`
  button {
    display: flex;
    gap: ${({spacing:e})=>e[1]};
    padding: ${({spacing:e})=>e[4]};
    width: 100%;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
    justify-content: center;
    align-items: center;
  }

  :host([data-size='sm']) button {
    padding: ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  :host([data-size='md']) button {
    padding: ${({spacing:e})=>e[3]};
    border-radius: ${({borderRadius:e})=>e[3]};
  }

  button:hover {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  button:disabled {
    opacity: 0.5;
  }
`,ln=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},un=class extends g{constructor(){super(...arguments),this.text=``,this.disabled=!1,this.size=`lg`,this.icon=`copy`,this.tabIdx=void 0}render(){this.dataset.size=this.size;let e=`${this.size}-regular`;return S`
      <button ?disabled=${this.disabled} tabindex=${O(this.tabIdx)}>
        <wui-icon name=${this.icon} size=${this.size} color="default"></wui-icon>
        <wui-text align="center" variant=${e} color="primary">${this.text}</wui-text>
      </button>
    `}};un.styles=[y,_,cn],ln([D()],un.prototype,`text`,void 0),ln([D({type:Boolean})],un.prototype,`disabled`,void 0),ln([D()],un.prototype,`size`,void 0),ln([D()],un.prototype,`icon`,void 0),ln([D()],un.prototype,`tabIdx`,void 0),un=ln([x(`wui-list-button`)],un);var dn=v`
  wui-separator {
    margin: ${({spacing:e})=>e[3]} calc(${({spacing:e})=>e[3]} * -1);
    width: calc(100% + ${({spacing:e})=>e[3]} * 2);
  }

  wui-email-input {
    width: 100%;
  }

  form {
    width: 100%;
    display: block;
    position: relative;
  }

  wui-icon-link,
  wui-loading-spinner {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  wui-icon-link {
    right: ${({spacing:e})=>e[2]};
  }

  wui-loading-spinner {
    right: ${({spacing:e})=>e[3]};
  }

  wui-text {
    margin: ${({spacing:e})=>e[2]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[0]} ${({spacing:e})=>e[3]};
  }
`,fn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},pn=class extends g{constructor(){super(),this.unsubscribe=[],this.formRef=Se(),this.email=``,this.loading=!1,this.error=``,this.remoteFeatures=i.state.remoteFeatures,this.hasExceededUsageLimit=u.state.plan.hasExceededUsageLimit,this.unsubscribe.push(i.subscribeKey(`remoteFeatures`,e=>{this.remoteFeatures=e}),u.subscribeKey(`plan`,e=>this.hasExceededUsageLimit=e.hasExceededUsageLimit))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}firstUpdated(){this.formRef.value?.addEventListener(`keydown`,e=>{e.key===`Enter`&&this.onSubmitEmail(e)})}render(){let e=h.hasAnyConnection(w.CONNECTOR_ID.AUTH);return S`
      <form ${xe(this.formRef)} @submit=${this.onSubmitEmail.bind(this)}>
        <wui-email-input
          @focus=${this.onFocusEvent.bind(this)}
          .disabled=${this.loading}
          @inputChange=${this.onEmailInputChange.bind(this)}
          tabIdx=${O(this.tabIdx)}
          ?disabled=${e||this.hasExceededUsageLimit}
        >
        </wui-email-input>

        ${this.submitButtonTemplate()}${this.loadingTemplate()}
        <input type="submit" hidden />
      </form>
      ${this.templateError()}
    `}submitButtonTemplate(){return!this.loading&&this.email.length>3?S`
          <wui-icon-link
            size="lg"
            icon="chevronRight"
            iconcolor="accent-100"
            @click=${this.onSubmitEmail.bind(this)}
          >
          </wui-icon-link>
        `:null}loadingTemplate(){return this.loading?S`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`:null}templateError(){return this.error?S`<wui-text variant="sm-medium" color="error">${this.error}</wui-text>`:null}onEmailInputChange(e){this.email=e.detail.trim(),this.error=``}async onSubmitEmail(e){if(!Ce.isValidEmail(this.email)){he.open({displayMessage:fe.ALERT_WARNINGS.INVALID_EMAIL.displayMessage},`warning`);return}if(!w.AUTH_CONNECTOR_SUPPORTED_CHAINS.find(e=>e===p.state.activeChain)){let e=p.getFirstCaipNetworkSupportsAuthConnector();if(e){l.push(`SwitchNetwork`,{network:e});return}}try{if(this.loading)return;this.loading=!0,e.preventDefault();let t=d.getAuthConnector();if(!t)throw Error(`w3m-email-login-widget: Auth connector not found`);let{action:n}=await t.provider.connectEmail({email:this.email});if(r.sendEvent({type:`track`,event:`EMAIL_SUBMITTED`}),n===`VERIFY_OTP`)r.sendEvent({type:`track`,event:`EMAIL_VERIFICATION_CODE_SENT`}),l.push(`EmailVerifyOtp`,{email:this.email});else if(n===`VERIFY_DEVICE`)l.push(`EmailVerifyDevice`,{email:this.email});else if(n===`CONNECT`){let e=this.remoteFeatures?.multiWallet;await h.connectExternal(t,p.state.activeChain),e?(l.replace(`ProfileWallets`),c.showSuccess(`New Wallet Added`)):l.replace(`Account`)}}catch(e){a.parseError(e)?.includes(`Invalid email`)?this.error=`Invalid email. Try again.`:c.showError(e)}finally{this.loading=!1}}onFocusEvent(){r.sendEvent({type:`track`,event:`EMAIL_LOGIN_SELECTED`})}};pn.styles=dn,fn([D()],pn.prototype,`tabIdx`,void 0),fn([k()],pn.prototype,`email`,void 0),fn([k()],pn.prototype,`loading`,void 0),fn([k()],pn.prototype,`error`,void 0),fn([k()],pn.prototype,`remoteFeatures`,void 0),fn([k()],pn.prototype,`hasExceededUsageLimit`,void 0),pn=fn([x(`w3m-email-login-widget`)],pn);var mn=v`
  :host {
    display: block;
    width: 100%;
  }

  button {
    width: 100%;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  @media (hover: hover) {
    button:hover:enabled {
      background: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`,hn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},gn=class extends g{constructor(){super(...arguments),this.logo=`google`,this.disabled=!1,this.tabIdx=void 0}render(){return S`
      <button ?disabled=${this.disabled} tabindex=${O(this.tabIdx)}>
        <wui-icon size="xxl" name=${this.logo}></wui-icon>
      </button>
    `}};gn.styles=[y,_,mn],hn([D()],gn.prototype,`logo`,void 0),hn([D({type:Boolean})],gn.prototype,`disabled`,void 0),hn([D()],gn.prototype,`tabIdx`,void 0),gn=hn([x(`wui-logo-select`)],gn);var _n=v`
  wui-separator {
    margin: ${({spacing:e})=>e[3]} calc(${({spacing:e})=>e[3]} * -1)
      ${({spacing:e})=>e[3]} calc(${({spacing:e})=>e[3]} * -1);
    width: calc(100% + ${({spacing:e})=>e[3]} * 2);
  }
`,vn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},yn=2,bn=6,xn=class extends g{constructor(){super(),this.unsubscribe=[],this.walletGuide=`get-started`,this.tabIdx=void 0,this.connectors=d.state.connectors,this.remoteFeatures=i.state.remoteFeatures,this.authConnector=this.connectors.find(e=>e.type===`AUTH`),this.isPwaLoading=!1,this.hasExceededUsageLimit=u.state.plan.hasExceededUsageLimit,this.unsubscribe.push(d.subscribeKey(`connectors`,e=>{this.connectors=e,this.authConnector=this.connectors.find(e=>e.type===`AUTH`)}),i.subscribeKey(`remoteFeatures`,e=>this.remoteFeatures=e),u.subscribeKey(`plan`,e=>this.hasExceededUsageLimit=e.hasExceededUsageLimit))}connectedCallback(){super.connectedCallback(),this.handlePwaFrameLoad()}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return S`
      <wui-flex
        class="container"
        flexDirection="column"
        gap="2"
        data-testid="w3m-social-login-widget"
      >
        ${this.topViewTemplate()}${this.bottomViewTemplate()}
      </wui-flex>
    `}topViewTemplate(){let e=this.walletGuide===`explore`,t=this.remoteFeatures?.socials;return!t&&e?(t=f.DEFAULT_SOCIALS,this.renderTopViewContent(t)):t?this.renderTopViewContent(t):null}renderTopViewContent(e){return e.length===2?S` <wui-flex gap="2">
        ${e.slice(0,yn).map(e=>S`<wui-logo-select
              data-testid=${`social-selector-${e}`}
              @click=${()=>{this.onSocialClick(e)}}
              logo=${e}
              tabIdx=${O(this.tabIdx)}
              ?disabled=${this.isPwaLoading||this.hasConnection()}
            ></wui-logo-select>`)}
      </wui-flex>`:S` <wui-list-button
      data-testid=${`social-selector-${e[0]}`}
      @click=${()=>{this.onSocialClick(e[0])}}
      size="lg"
      icon=${O(e[0])}
      text=${`Continue with ${b.capitalize(e[0])}`}
      tabIdx=${O(this.tabIdx)}
      ?disabled=${this.isPwaLoading||this.hasConnection()}
    ></wui-list-button>`}bottomViewTemplate(){let e=this.remoteFeatures?.socials,t=this.walletGuide===`explore`;return(!this.authConnector||!e||e.length===0)&&t&&(e=f.DEFAULT_SOCIALS),!e||e.length<=yn?null:e&&e.length>bn?S`<wui-flex gap="2">
        ${e.slice(1,bn-1).map(e=>S`<wui-logo-select
              data-testid=${`social-selector-${e}`}
              @click=${()=>{this.onSocialClick(e)}}
              logo=${e}
              tabIdx=${O(this.tabIdx)}
              ?focusable=${this.tabIdx!==void 0&&this.tabIdx>=0}
              ?disabled=${this.isPwaLoading||this.hasConnection()}
            ></wui-logo-select>`)}
        <wui-logo-select
          logo="more"
          tabIdx=${O(this.tabIdx)}
          @click=${this.onMoreSocialsClick.bind(this)}
          ?disabled=${this.isPwaLoading||this.hasConnection()}
          data-testid="social-selector-more"
        ></wui-logo-select>
      </wui-flex>`:e?S`<wui-flex gap="2">
      ${e.slice(1,e.length).map(e=>S`<wui-logo-select
            data-testid=${`social-selector-${e}`}
            @click=${()=>{this.onSocialClick(e)}}
            logo=${e}
            tabIdx=${O(this.tabIdx)}
            ?focusable=${this.tabIdx!==void 0&&this.tabIdx>=0}
            ?disabled=${this.isPwaLoading||this.hasConnection()}
          ></wui-logo-select>`)}
    </wui-flex>`:null}onMoreSocialsClick(){l.push(`ConnectSocials`)}async onSocialClick(e){if(this.hasExceededUsageLimit){l.push(`UsageExceeded`);return}if(!w.AUTH_CONNECTOR_SUPPORTED_CHAINS.find(e=>e===p.state.activeChain)){let e=p.getFirstCaipNetworkSupportsAuthConnector();if(e){l.push(`SwitchNetwork`,{network:e});return}}e&&await be(e)}async handlePwaFrameLoad(){if(a.isPWA()){this.isPwaLoading=!0;try{this.authConnector?.provider instanceof de&&await this.authConnector.provider.init()}catch(e){he.open({displayMessage:`Error loading embedded wallet in PWA`,debugMessage:e.message},`error`)}finally{this.isPwaLoading=!1}}}hasConnection(){return h.hasAnyConnection(w.CONNECTOR_ID.AUTH)}};xn.styles=_n,vn([D()],xn.prototype,`walletGuide`,void 0),vn([D()],xn.prototype,`tabIdx`,void 0),vn([k()],xn.prototype,`connectors`,void 0),vn([k()],xn.prototype,`remoteFeatures`,void 0),vn([k()],xn.prototype,`authConnector`,void 0),vn([k()],xn.prototype,`isPwaLoading`,void 0),vn([k()],xn.prototype,`hasExceededUsageLimit`,void 0),xn=vn([x(`w3m-social-login-widget`)],xn);var Sn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Cn=class extends g{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=d.state.connectors,this.count=u.state.count,this.filteredCount=u.state.filteredWallets.length,this.isFetchingRecommendedWallets=u.state.isFetchingRecommendedWallets,this.unsubscribe.push(d.subscribeKey(`connectors`,e=>this.connectors=e),u.subscribeKey(`count`,e=>this.count=e),u.subscribeKey(`filteredWallets`,e=>this.filteredCount=e.length),u.subscribeKey(`isFetchingRecommendedWallets`,e=>this.isFetchingRecommendedWallets=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=this.connectors.find(e=>e.id===`walletConnect`),{allWallets:t}=i.state;if(!e||t===`HIDE`||t===`ONLY_MOBILE`&&!a.isMobile())return null;let n=u.state.featured.length,r=this.count+n,o=r<10?r:Math.floor(r/10)*10,s=this.filteredCount>0?this.filteredCount:o,c=`${s}`;this.filteredCount>0?c=`${this.filteredCount}`:s<r&&(c=`${s}+`);let l=h.hasAnyConnection(w.CONNECTOR_ID.WALLET_CONNECT);return S`
      <wui-list-wallet
        name="Search Wallet"
        walletIcon="search"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${c}
        tagVariant="info"
        data-testid="all-wallets"
        tabIdx=${O(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        ?disabled=${l}
        size="sm"
      ></wui-list-wallet>
    `}onAllWallets(){r.sendEvent({type:`track`,event:`CLICK_ALL_WALLETS`}),l.push(`AllWallets`,{redirectView:l.state.data?.redirectView})}};Sn([D()],Cn.prototype,`tabIdx`,void 0),Sn([k()],Cn.prototype,`connectors`,void 0),Sn([k()],Cn.prototype,`count`,void 0),Sn([k()],Cn.prototype,`filteredCount`,void 0),Sn([k()],Cn.prototype,`isFetchingRecommendedWallets`,void 0),Cn=Sn([x(`w3m-all-wallets-widget`)],Cn);var wn=v`
  :host {
    margin-top: ${({spacing:e})=>e[1]};
  }
  wui-separator {
    margin: ${({spacing:e})=>e[3]} calc(${({spacing:e})=>e[3]} * -1)
      ${({spacing:e})=>e[2]} calc(${({spacing:e})=>e[3]} * -1);
    width: calc(100% + ${({spacing:e})=>e[3]} * 2);
  }
`,Tn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},En=class extends g{constructor(){super(),this.unsubscribe=[],this.explorerWallets=u.state.explorerWallets,this.connections=h.state.connections,this.connectorImages=ne.state.connectorImages,this.loadingTelegram=!1,this.unsubscribe.push(h.subscribeKey(`connections`,e=>this.connections=e),ne.subscribeKey(`connectorImages`,e=>this.connectorImages=e),u.subscribeKey(`explorerFilteredWallets`,e=>{this.explorerWallets=e?.length?e:u.state.explorerWallets}),u.subscribeKey(`explorerWallets`,e=>{this.explorerWallets?.length||(this.explorerWallets=e)})),a.isTelegram()&&a.isIos()&&(this.loadingTelegram=!h.state.wcUri,this.unsubscribe.push(h.subscribeKey(`wcUri`,e=>this.loadingTelegram=!e)))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return S`
      <wui-flex flexDirection="column" gap="2"> ${this.connectorListTemplate()} </wui-flex>
    `}connectorListTemplate(){return t.connectorList().map((e,t)=>e.kind===`connector`?this.renderConnector(e,t):this.renderWallet(e,t))}getConnectorNamespaces(e){return e.subtype===`walletConnect`?[]:e.subtype===`multiChain`?e.connector.connectors?.map(e=>e.chain)||[]:[e.connector.chain]}renderConnector(e,t){let n=e.connector,r=s.getConnectorImage(n)||this.connectorImages[n?.imageId??``],i=(this.connections.get(n.chain)??[]).some(e=>E.isLowerCaseMatch(e.connectorId,n.id)),a,o;e.subtype===`walletConnect`?(a=`qr code`,o=`accent`):e.subtype===`injected`||e.subtype===`announced`?(a=i?`connected`:`installed`,o=i?`info`:`success`):(a=void 0,o=void 0);let c=h.hasAnyConnection(w.CONNECTOR_ID.WALLET_CONNECT),l=e.subtype===`walletConnect`||e.subtype===`external`?c:!1;return S`
      <w3m-list-wallet
        displayIndex=${t}
        imageSrc=${O(r)}
        .installed=${!0}
        name=${n.name??`Unknown`}
        .tagVariant=${o}
        tagLabel=${O(a)}
        data-testid=${`wallet-selector-${n.id.toLowerCase()}`}
        size="sm"
        @click=${()=>this.onClickConnector(e)}
        tabIdx=${O(this.tabIdx)}
        ?disabled=${l}
        rdnsId=${O(n.explorerWallet?.rdns||void 0)}
        walletRank=${O(n.explorerWallet?.order)}
        .namespaces=${this.getConnectorNamespaces(e)}
      >
      </w3m-list-wallet>
    `}onClickConnector(e){let t=l.state.data?.redirectView;if(e.subtype===`walletConnect`){d.setActiveConnector(e.connector),a.isMobile()?l.push(`AllWallets`):l.push(`ConnectingWalletConnect`,{redirectView:t});return}if(e.subtype===`multiChain`){d.setActiveConnector(e.connector),l.push(`ConnectingMultiChain`,{redirectView:t});return}if(e.subtype===`injected`){d.setActiveConnector(e.connector),l.push(`ConnectingExternal`,{connector:e.connector,redirectView:t,wallet:e.connector.explorerWallet});return}if(e.subtype===`announced`){if(e.connector.id===`walletConnect`){a.isMobile()?l.push(`AllWallets`):l.push(`ConnectingWalletConnect`,{redirectView:t});return}l.push(`ConnectingExternal`,{connector:e.connector,redirectView:t,wallet:e.connector.explorerWallet});return}l.push(`ConnectingExternal`,{connector:e.connector,redirectView:t})}renderWallet(e,t){let n=e.wallet,r=s.getWalletImage(n),i=h.hasAnyConnection(w.CONNECTOR_ID.WALLET_CONNECT),a=this.loadingTelegram,o=e.subtype===`recent`?`recent`:void 0,c=e.subtype===`recent`?`info`:void 0;return S`
      <w3m-list-wallet
        displayIndex=${t}
        imageSrc=${O(r)}
        name=${n.name??`Unknown`}
        @click=${()=>this.onClickWallet(e)}
        size="sm"
        data-testid=${`wallet-selector-${n.id}`}
        tabIdx=${O(this.tabIdx)}
        ?loading=${a}
        ?disabled=${i}
        rdnsId=${O(n.rdns||void 0)}
        walletRank=${O(n.order)}
        tagLabel=${O(o)}
        .tagVariant=${c}
      >
      </w3m-list-wallet>
    `}onClickWallet(e){let t=l.state.data?.redirectView,n=p.state.activeChain;if(e.subtype===`featured`){d.selectWalletConnector(e.wallet);return}if(e.subtype===`recent`){if(this.loadingTelegram)return;d.selectWalletConnector(e.wallet);return}if(e.subtype===`custom`){if(this.loadingTelegram)return;l.push(`ConnectingWalletConnect`,{wallet:e.wallet,redirectView:t});return}if(this.loadingTelegram)return;let r=n?d.getConnector({id:e.wallet.id,namespace:n}):void 0;r?l.push(`ConnectingExternal`,{connector:r,redirectView:t}):l.push(`ConnectingWalletConnect`,{wallet:e.wallet,redirectView:t})}};En.styles=wn,Tn([D({type:Number})],En.prototype,`tabIdx`,void 0),Tn([k()],En.prototype,`explorerWallets`,void 0),Tn([k()],En.prototype,`connections`,void 0),Tn([k()],En.prototype,`connectorImages`,void 0),Tn([k()],En.prototype,`loadingTelegram`,void 0),En=Tn([x(`w3m-connector-list`)],En);var Dn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},On=class extends g{constructor(){super(...arguments),this.tabIdx=void 0}render(){return S`
      <wui-flex flexDirection="column" gap="2">
        <w3m-connector-list tabIdx=${O(this.tabIdx)}></w3m-connector-list>
        <w3m-all-wallets-widget tabIdx=${O(this.tabIdx)}></w3m-all-wallets-widget>
      </wui-flex>
    `}};Dn([D()],On.prototype,`tabIdx`,void 0),On=Dn([x(`w3m-wallet-login-list`)],On);var kn=v`
  :host {
    --connect-scroll--top-opacity: 0;
    --connect-scroll--bottom-opacity: 0;
    --connect-mask-image: none;
  }

  .connect {
    max-height: clamp(360px, 470px, 80vh);
    scrollbar-width: none;
    overflow-y: scroll;
    overflow-x: hidden;
    transition: opacity ${({durations:e})=>e.lg}
      ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: opacity;
    mask-image: var(--connect-mask-image);
  }

  .guide {
    transition: opacity ${({durations:e})=>e.lg}
      ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: opacity;
  }

  .connect::-webkit-scrollbar {
    display: none;
  }

  .all-wallets {
    flex-flow: column;
  }

  .connect.disabled,
  .guide.disabled {
    opacity: 0.3;
    pointer-events: none;
    user-select: none;
  }

  wui-separator {
    margin: ${({spacing:e})=>e[3]} calc(${({spacing:e})=>e[3]} * -1);
    width: calc(100% + ${({spacing:e})=>e[3]} * 2);
  }
`,X=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},An=470,Z=class extends g{constructor(){super(),this.unsubscribe=[],this.connectors=d.state.connectors,this.authConnector=this.connectors.find(e=>e.type===`AUTH`),this.features=i.state.features,this.remoteFeatures=i.state.remoteFeatures,this.enableWallets=i.state.enableWallets,this.noAdapters=p.state.noAdapters,this.walletGuide=`get-started`,this.checked=pe.state.isLegalCheckboxChecked,this.isEmailEnabled=this.remoteFeatures?.email&&!p.state.noAdapters,this.isSocialEnabled=this.remoteFeatures?.socials&&this.remoteFeatures.socials.length>0&&!p.state.noAdapters,this.isAuthEnabled=this.checkIfAuthEnabled(this.connectors),this.unsubscribe.push(d.subscribeKey(`connectors`,e=>{this.connectors=e,this.authConnector=this.connectors.find(e=>e.type===`AUTH`),this.isAuthEnabled=this.checkIfAuthEnabled(this.connectors)}),i.subscribeKey(`features`,e=>{this.features=e}),i.subscribeKey(`remoteFeatures`,e=>{this.remoteFeatures=e,this.setEmailAndSocialEnableCheck(this.noAdapters,this.remoteFeatures)}),i.subscribeKey(`enableWallets`,e=>this.enableWallets=e),p.subscribeKey(`noAdapters`,e=>this.setEmailAndSocialEnableCheck(e,this.remoteFeatures)),pe.subscribeKey(`isLegalCheckboxChecked`,e=>this.checked=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.resizeObserver?.disconnect(),(this.shadowRoot?.querySelector(`.connect`))?.removeEventListener(`scroll`,this.handleConnectListScroll.bind(this))}firstUpdated(){let e=this.shadowRoot?.querySelector(`.connect`);e&&(requestAnimationFrame(this.handleConnectListScroll.bind(this)),e?.addEventListener(`scroll`,this.handleConnectListScroll.bind(this)),this.resizeObserver=new ResizeObserver(()=>{this.handleConnectListScroll()}),this.resizeObserver?.observe(e),this.handleConnectListScroll())}render(){let{termsConditionsUrl:e,privacyPolicyUrl:t}=i.state,n=i.state.features?.legalCheckbox,r=!!(e||t)&&!!n&&this.walletGuide===`get-started`&&!this.checked,a={connect:!0,disabled:r},o=i.state.enableWalletGuide,s=this.enableWallets,c=this.isSocialEnabled||this.authConnector,l=r?-1:void 0;return S`
      <wui-flex flexDirection="column">
        ${this.legalCheckboxTemplate()}
        <wui-flex
          data-testid="w3m-connect-scroll-view"
          flexDirection="column"
          .padding=${[`0`,`0`,`4`,`0`]}
          class=${ve(a)}
        >
          <wui-flex
            class="connect-methods"
            flexDirection="column"
            gap="2"
            .padding=${c&&s&&o&&this.walletGuide===`get-started`?[`0`,`3`,`0`,`3`]:[`0`,`3`,`3`,`3`]}
          >
            ${this.renderConnectMethod(l)}
          </wui-flex>
        </wui-flex>
        ${this.reownBrandingTemplate()}
      </wui-flex>
    `}reownBrandingTemplate(){return Ce.hasFooter()||!this.remoteFeatures?.reownBranding?null:S`<wui-ux-by-reown></wui-ux-by-reown>`}setEmailAndSocialEnableCheck(e,t){this.isEmailEnabled=t?.email&&!e,this.isSocialEnabled=t?.socials&&t.socials.length>0&&!e,this.remoteFeatures=t,this.noAdapters=e}checkIfAuthEnabled(e){let t=e.filter(e=>e.type===ge.CONNECTOR_TYPE_AUTH).map(e=>e.chain);return w.AUTH_CONNECTOR_SUPPORTED_CHAINS.some(e=>t.includes(e))}renderConnectMethod(e){return S`${se.getConnectOrderMethod(this.features,this.connectors).map((t,n)=>{switch(t){case`email`:return S`${this.emailTemplate(e)} ${this.separatorTemplate(n,`email`)}`;case`social`:return S`${this.socialListTemplate(e)}
          ${this.separatorTemplate(n,`social`)}`;case`wallet`:return S`${this.walletListTemplate(e)}
          ${this.separatorTemplate(n,`wallet`)}`;default:return null}})}`}checkMethodEnabled(e){switch(e){case`wallet`:return this.enableWallets;case`social`:return this.isSocialEnabled&&this.isAuthEnabled;case`email`:return this.isEmailEnabled&&this.isAuthEnabled;default:return null}}checkIsThereNextMethod(e){let t=se.getConnectOrderMethod(this.features,this.connectors)[e+1];if(t)return this.checkMethodEnabled(t)?t:this.checkIsThereNextMethod(e+1)}separatorTemplate(e,t){let n=this.checkIsThereNextMethod(e),r=this.walletGuide===`explore`;switch(t){case`wallet`:return this.enableWallets&&n&&!r?S`<wui-separator data-testid="wui-separator" text="or"></wui-separator>`:null;case`email`:{let e=n===`social`;return this.isAuthEnabled&&this.isEmailEnabled&&!e&&n?S`<wui-separator
              data-testid="w3m-email-login-or-separator"
              text="or"
            ></wui-separator>`:null}case`social`:{let e=n===`email`;return this.isAuthEnabled&&this.isSocialEnabled&&!e&&n?S`<wui-separator data-testid="wui-separator" text="or"></wui-separator>`:null}default:return null}}emailTemplate(e){return!this.isEmailEnabled||!this.isAuthEnabled?null:S`<w3m-email-login-widget tabIdx=${O(e)}></w3m-email-login-widget>`}socialListTemplate(e){return!this.isSocialEnabled||!this.isAuthEnabled?null:S`<w3m-social-login-widget
      walletGuide=${this.walletGuide}
      tabIdx=${O(e)}
    ></w3m-social-login-widget>`}walletListTemplate(e){let t=this.enableWallets,n=this.features?.emailShowWallets===!1,r=this.features?.collapseWallets,i=n||r;return!t||(a.isTelegram()&&(a.isSafari()||a.isIos())&&h.connectWalletConnect().catch(e=>({})),this.walletGuide===`explore`)?null:this.isAuthEnabled&&(this.isEmailEnabled||this.isSocialEnabled)&&i?S`<wui-list-button
        data-testid="w3m-collapse-wallets-button"
        tabIdx=${O(e)}
        @click=${this.onContinueWalletClick.bind(this)}
        text="Continue with a wallet"
        icon="wallet"
      ></wui-list-button>`:S`<w3m-wallet-login-list tabIdx=${O(e)}></w3m-wallet-login-list>`}legalCheckboxTemplate(){return this.walletGuide===`explore`?null:S`<w3m-legal-checkbox data-testid="w3m-legal-checkbox"></w3m-legal-checkbox>`}handleConnectListScroll(){let e=this.shadowRoot?.querySelector(`.connect`);e&&(e.scrollHeight>An?(e.style.setProperty(`--connect-mask-image`,`linear-gradient(
          to bottom,
          rgba(0, 0, 0, calc(1 - var(--connect-scroll--top-opacity))) 0px,
          rgba(200, 200, 200, calc(1 - var(--connect-scroll--top-opacity))) 1px,
          black 100px,
          black calc(100% - 100px),
          rgba(155, 155, 155, calc(1 - var(--connect-scroll--bottom-opacity))) calc(100% - 1px),
          rgba(0, 0, 0, calc(1 - var(--connect-scroll--bottom-opacity))) 100%
        )`),e.style.setProperty(`--connect-scroll--top-opacity`,le.interpolate([0,50],[0,1],e.scrollTop).toString()),e.style.setProperty(`--connect-scroll--bottom-opacity`,le.interpolate([0,50],[0,1],e.scrollHeight-e.scrollTop-e.offsetHeight).toString())):(e.style.setProperty(`--connect-mask-image`,`none`),e.style.setProperty(`--connect-scroll--top-opacity`,`0`),e.style.setProperty(`--connect-scroll--bottom-opacity`,`0`)))}onContinueWalletClick(){l.push(`ConnectWallets`)}};Z.styles=kn,X([k()],Z.prototype,`connectors`,void 0),X([k()],Z.prototype,`authConnector`,void 0),X([k()],Z.prototype,`features`,void 0),X([k()],Z.prototype,`remoteFeatures`,void 0),X([k()],Z.prototype,`enableWallets`,void 0),X([k()],Z.prototype,`noAdapters`,void 0),X([D()],Z.prototype,`walletGuide`,void 0),X([k()],Z.prototype,`checked`,void 0),X([k()],Z.prototype,`isEmailEnabled`,void 0),X([k()],Z.prototype,`isSocialEnabled`,void 0),X([k()],Z.prototype,`isAuthEnabled`,void 0),Z=X([x(`w3m-connect-view`)],Z);var jn=v`
  wui-flex {
    width: 100%;
    height: 52px;
    box-sizing: border-box;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    padding-left: ${({spacing:e})=>e[3]};
    padding-right: ${({spacing:e})=>e[3]};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({spacing:e})=>e[6]};
  }

  wui-text {
    color: ${({tokens:e})=>e.theme.textSecondary};
    min-width: 0;
    flex: 1 1 auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  wui-button {
    flex-shrink: 0;
  }

  wui-icon {
    width: 12px;
    height: 12px;
  }
`,Mn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Nn=class extends g{constructor(){super(...arguments),this.disabled=!1,this.label=``,this.buttonLabel=``}render(){return S`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="inherit">${this.label}</wui-text>
        <wui-button variant="accent-secondary" size="sm">
          ${this.buttonLabel}
          <wui-icon name="chevronRight" color="inherit" size="inherit" slot="iconRight"></wui-icon>
        </wui-button>
      </wui-flex>
    `}};Nn.styles=[y,_,jn],Mn([D({type:Boolean})],Nn.prototype,`disabled`,void 0),Mn([D()],Nn.prototype,`label`,void 0),Mn([D()],Nn.prototype,`buttonLabel`,void 0),Nn=Mn([x(`wui-cta-button`)],Nn);var Pn=v`
  :host {
    display: block;
    padding: 0 ${({spacing:e})=>e[5]} ${({spacing:e})=>e[5]};
  }
`,Fn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},In=class extends g{constructor(){super(...arguments),this.wallet=void 0}render(){if(!this.wallet)return this.style.display=`none`,null;let{name:e,app_store:t,play_store:n,chrome_store:r,homepage:i}=this.wallet,o=a.isMobile(),s=a.isIos(),c=a.isAndroid(),u=[t,n,i,r].filter(Boolean).length>1;return u&&!o?S`
        <wui-cta-button
          label=${`Don't have ${e}?`}
          buttonLabel="Get"
          @click=${()=>l.push(`Downloads`,{wallet:this.wallet})}
        ></wui-cta-button>
      `:!u&&i?S`
        <wui-cta-button
          label=${`Don't have ${e}?`}
          buttonLabel="Get"
          @click=${this.onHomePage.bind(this)}
        ></wui-cta-button>
      `:t&&s?S`
        <wui-cta-button
          label=${`Don't have ${e}?`}
          buttonLabel="Get"
          @click=${this.onAppStore.bind(this)}
        ></wui-cta-button>
      `:n&&c?S`
        <wui-cta-button
          label=${`Don't have ${e}?`}
          buttonLabel="Get"
          @click=${this.onPlayStore.bind(this)}
        ></wui-cta-button>
      `:(this.style.display=`none`,null)}onAppStore(){this.wallet?.app_store&&a.openHref(this.wallet.app_store,`_blank`)}onPlayStore(){this.wallet?.play_store&&a.openHref(this.wallet.play_store,`_blank`)}onHomePage(){this.wallet?.homepage&&a.openHref(this.wallet.homepage,`_blank`)}};In.styles=[Pn],Fn([D({type:Object})],In.prototype,`wallet`,void 0),In=Fn([x(`w3m-mobile-download-links`)],In);var Ln=v`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-wallet-image {
    width: 56px;
    height: 56px;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({spacing:e})=>e[1]} * -1);
    bottom: calc(${({spacing:e})=>e[1]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition-property: opacity, transform;
    transition-duration: ${({durations:e})=>e.lg};
    transition-timing-function: ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({spacing:e})=>e[4]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({easings:e})=>e[`ease-out-power-2`]} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  w3m-mobile-download-links {
    padding: 0px;
    width: 100%;
  }
`,Q=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},$=class extends g{constructor(){super(),this.wallet=l.state.data?.wallet,this.connector=l.state.data?.connector,this.timeout=void 0,this.secondaryBtnIcon=`refresh`,this.onConnect=void 0,this.onRender=void 0,this.onAutoConnect=void 0,this.isWalletConnect=!0,this.unsubscribe=[],this.imageSrc=s.getConnectorImage(this.connector)??s.getWalletImage(this.wallet),this.name=this.wallet?.name??this.connector?.name??`Wallet`,this.isRetrying=!1,this.uri=h.state.wcUri,this.error=h.state.wcError,this.ready=!1,this.showRetry=!1,this.label=void 0,this.secondaryBtnLabel=`Try again`,this.secondaryLabel=`Accept connection request in the wallet`,this.isLoading=!1,this.isMobile=!1,this.onRetry=void 0,this.unsubscribe.push(h.subscribeKey(`wcUri`,e=>{this.uri=e,this.isRetrying&&this.onRetry&&(this.isRetrying=!1,this.onConnect?.())}),h.subscribeKey(`wcError`,e=>this.error=e)),(a.isTelegram()||a.isSafari())&&a.isIos()&&h.state.wcUri&&this.onConnect?.()}firstUpdated(){this.onAutoConnect?.(),this.showRetry=!this.onAutoConnect}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),h.setWcError(!1),clearTimeout(this.timeout)}render(){this.onRender?.(),this.onShowRetry();let e=this.error?`Connection can be declined if a previous request is still active`:this.secondaryLabel,t=``;return this.label?t=this.label:(t=`Continue in ${this.name}`,this.error&&(t=`Connection declined`)),S`
      <wui-flex
        data-error=${O(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${[`10`,`5`,`5`,`5`]}
        gap="6"
      >
        <wui-flex gap="2" justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${O(this.imageSrc)}></wui-wallet-image>

          ${this.error?null:this.loaderTemplate()}

          <wui-icon-box
            color="error"
            icon="close"
            size="sm"
            border
            borderColor="wui-color-bg-125"
          ></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="6"> <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${[`2`,`0`,`0`,`0`]}
        >
          <wui-text align="center" variant="lg-medium" color=${this.error?`error`:`primary`}>
            ${t}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary">${e}</wui-text>
        </wui-flex>

        ${this.secondaryBtnLabel?S`
                <wui-button
                  variant="neutral-secondary"
                  size="md"
                  ?disabled=${this.isRetrying||this.isLoading}
                  @click=${this.onTryAgain.bind(this)}
                  data-testid="w3m-connecting-widget-secondary-button"
                >
                  <wui-icon
                    color="inherit"
                    slot="iconLeft"
                    name=${this.secondaryBtnIcon}
                  ></wui-icon>
                  ${this.secondaryBtnLabel}
                </wui-button>
              `:null}
      </wui-flex>

      ${this.isWalletConnect?S`
              <wui-flex .padding=${[`0`,`5`,`5`,`5`]} justifyContent="center">
                <wui-link
                  @click=${this.onCopyUri}
                  variant="secondary"
                  icon="copy"
                  data-testid="wui-link-copy"
                >
                  Copy link
                </wui-link>
              </wui-flex>
            `:null}

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links></wui-flex>
      </wui-flex>
    `}onShowRetry(){this.error&&!this.showRetry&&(this.showRetry=!0,(this.shadowRoot?.querySelector(`wui-button`))?.animate([{opacity:0},{opacity:1}],{fill:`forwards`,easing:`ease`}))}onTryAgain(){h.setWcError(!1),this.onRetry?(this.isRetrying=!0,this.onRetry?.()):this.onConnect?.()}loaderTemplate(){let e=ce.state.themeVariables[`--w3m-border-radius-master`];return S`<wui-loading-thumbnail radius=${(e?parseInt(e.replace(`px`,``),10):4)*9}></wui-loading-thumbnail>`}onCopyUri(){try{this.uri&&(a.copyToClopboard(this.uri),c.showSuccess(`Link copied`))}catch{c.showError(`Failed to copy`)}}};$.styles=Ln,Q([k()],$.prototype,`isRetrying`,void 0),Q([k()],$.prototype,`uri`,void 0),Q([k()],$.prototype,`error`,void 0),Q([k()],$.prototype,`ready`,void 0),Q([k()],$.prototype,`showRetry`,void 0),Q([k()],$.prototype,`label`,void 0),Q([k()],$.prototype,`secondaryBtnLabel`,void 0),Q([k()],$.prototype,`secondaryLabel`,void 0),Q([k()],$.prototype,`isLoading`,void 0),Q([D({type:Boolean})],$.prototype,`isMobile`,void 0),Q([D()],$.prototype,`onRetry`,void 0);var Rn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},zn=class extends ${constructor(){if(super(),this.externalViewUnsubscribe=[],this.connectionsByNamespace=h.getConnections(this.connector?.chain),this.hasMultipleConnections=this.connectionsByNamespace.length>0,this.remoteFeatures=i.state.remoteFeatures,this.currentActiveConnectorId=d.state.activeConnectorIds[this.connector?.chain],!this.connector)throw Error(`w3m-connecting-view: No connector provided`);let e=this.connector?.chain;this.isAlreadyConnected(this.connector)&&(this.secondaryBtnLabel=void 0,this.label=`This account is already linked, change your account in ${this.connector.name}`,this.secondaryLabel=`To link a new account, open ${this.connector.name} and switch to the account you want to link`),r.sendEvent({type:`track`,event:`SELECT_WALLET`,properties:{name:this.connector.name??`Unknown`,platform:`browser`,displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:l.state.view}}),this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),this.isWalletConnect=!1,this.externalViewUnsubscribe.push(d.subscribeKey(`activeConnectorIds`,t=>{let n=t[e],r=this.remoteFeatures?.multiWallet,{redirectView:i}=l.state.data??{};n!==this.currentActiveConnectorId&&(this.hasMultipleConnections&&r?(l.replace(`ProfileWallets`),c.showSuccess(`New Wallet Added`)):i?l.replace(i):m.close())}),h.subscribeKey(`connections`,this.onConnectionsChange.bind(this)))}disconnectedCallback(){this.externalViewUnsubscribe.forEach(e=>e())}async onConnectProxy(){try{if(this.error=!1,this.connector){if(this.isAlreadyConnected(this.connector))return;(!(this.connector.id===w.CONNECTOR_ID.COINBASE_SDK||this.connector.id===w.CONNECTOR_ID.BASE_ACCOUNT)||!this.error)&&await h.connectExternal(this.connector,this.connector.chain)}}catch(t){t instanceof e&&t.originalName===te.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?r.sendEvent({type:`track`,event:`USER_REJECTED`,properties:{message:t.message}}):r.sendEvent({type:`track`,event:`CONNECT_ERROR`,properties:{message:t?.message??`Unknown`}}),this.error=!0}}onConnectionsChange(e){if(this.connector?.chain&&e.get(this.connector.chain)&&this.isAlreadyConnected(this.connector)){let t=e.get(this.connector.chain)??[],n=this.remoteFeatures?.multiWallet;if(t.length===0)l.replace(`Connect`);else{let e=ae.getConnectionsByConnectorId(this.connectionsByNamespace,this.connector.id).flatMap(e=>e.accounts),r=ae.getConnectionsByConnectorId(t,this.connector.id).flatMap(e=>e.accounts);r.length===0?this.hasMultipleConnections&&n?(l.replace(`ProfileWallets`),c.showSuccess(`Wallet deleted`)):m.close():!e.every(e=>r.some(t=>E.isLowerCaseMatch(e.address,t.address)))&&n&&l.replace(`ProfileWallets`)}}}isAlreadyConnected(e){return!!e&&this.connectionsByNamespace.some(t=>E.isLowerCaseMatch(t.connectorId,e.id))}};zn=Rn([x(`w3m-connecting-external-view`)],zn);var Bn=C`
  wui-flex,
  wui-list-wallet {
    width: 100%;
  }
`,Vn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Hn=class extends g{constructor(){super(),this.unsubscribe=[],this.activeConnector=d.state.activeConnector,this.unsubscribe.push(d.subscribeKey(`activeConnector`,e=>this.activeConnector=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return S`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${[`3`,`5`,`5`,`5`]}
        gap="5"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-wallet-image
            size="lg"
            imageSrc=${O(s.getConnectorImage(this.activeConnector))}
          ></wui-wallet-image>
        </wui-flex>
        <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${[`0`,`3`,`0`,`3`]}
        >
          <wui-text variant="lg-medium" color="primary">
            Select Chain for ${this.activeConnector?.name}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary"
            >Select which chain to connect to your multi chain wallet</wui-text
          >
        </wui-flex>
        <wui-flex
          flexGrow="1"
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${[`2`,`0`,`2`,`0`]}
        >
          ${this.networksTemplate()}
        </wui-flex>
      </wui-flex>
    `}networksTemplate(){return this.activeConnector?.connectors?.map((e,t)=>e.name?S`
            <w3m-list-wallet
              displayIndex=${t}
              imageSrc=${O(s.getChainImage(e.chain))}
              name=${w.CHAIN_NAME_MAP[e.chain]}
              @click=${()=>this.onConnector(e)}
              size="sm"
              data-testid="wui-list-chain-${e.chain}"
              rdnsId=${e.explorerWallet?.rdns}
            ></w3m-list-wallet>
          `:null)}onConnector(e){let t=this.activeConnector?.connectors?.find(t=>t.chain===e.chain),n=l.state.data?.redirectView;if(!t){c.showError(`Failed to find connector`);return}t.id===`walletConnect`?a.isMobile()?l.push(`AllWallets`):l.push(`ConnectingWalletConnect`,{redirectView:n}):l.push(`ConnectingExternal`,{connector:t,redirectView:n,wallet:this.activeConnector?.explorerWallet})}};Hn.styles=Bn,Vn([k()],Hn.prototype,`activeConnector`,void 0),Hn=Vn([x(`w3m-connecting-multi-chain-view`)],Hn);var Un=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Wn=class extends g{constructor(){super(...arguments),this.platformTabs=[],this.unsubscribe=[],this.platforms=[],this.onSelectPlatfrom=void 0}disconnectCallback(){this.unsubscribe.forEach(e=>e())}render(){return S`
      <wui-flex justifyContent="center" .padding=${[`0`,`0`,`4`,`0`]}>
        <wui-tabs .tabs=${this.generateTabs()} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `}generateTabs(){let e=this.platforms.map(e=>e===`browser`?{label:`Browser`,icon:`extension`,platform:`browser`}:e===`mobile`?{label:`Mobile`,icon:`mobile`,platform:`mobile`}:e===`qrcode`?{label:`Mobile`,icon:`mobile`,platform:`qrcode`}:e===`web`?{label:`Webapp`,icon:`browser`,platform:`web`}:e===`desktop`?{label:`Desktop`,icon:`desktop`,platform:`desktop`}:{label:`Browser`,icon:`extension`,platform:`unsupported`});return this.platformTabs=e.map(({platform:e})=>e),e}onTabChange(e){let t=this.platformTabs[e];t&&this.onSelectPlatfrom?.(t)}};Un([D({type:Array})],Wn.prototype,`platforms`,void 0),Un([D()],Wn.prototype,`onSelectPlatfrom`,void 0),Wn=Un([x(`w3m-connecting-header`)],Wn);var Gn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Kn=class extends ${constructor(){if(super(),!this.wallet)throw Error(`w3m-connecting-wc-browser: No wallet provided`);this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),r.sendEvent({type:`track`,event:`SELECT_WALLET`,properties:{name:this.wallet.name,platform:`browser`,displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:l.state.view}})}async onConnectProxy(){try{this.error=!1;let{connectors:e}=d.state,t=e.find(e=>e.type===`ANNOUNCED`&&e.info?.rdns===this.wallet?.rdns||e.type===`INJECTED`||e.name===this.wallet?.name);if(t)await h.connectExternal(t,t.chain);else throw Error(`w3m-connecting-wc-browser: No connector found`);(!i.state.siwx||await me.isAuthenticated())&&m.close()}catch(t){t instanceof e&&t.originalName===te.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?r.sendEvent({type:`track`,event:`USER_REJECTED`,properties:{message:t.message}}):r.sendEvent({type:`track`,event:`CONNECT_ERROR`,properties:{message:t?.message??`Unknown`}}),this.error=!0}}};Kn=Gn([x(`w3m-connecting-wc-browser`)],Kn);var qn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Jn=class extends ${constructor(){if(super(),!this.wallet)throw Error(`w3m-connecting-wc-desktop: No wallet provided`);this.onConnect=this.onConnectProxy.bind(this),this.onRender=this.onRenderProxy.bind(this),r.sendEvent({type:`track`,event:`SELECT_WALLET`,properties:{name:this.wallet.name,platform:`desktop`,displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:l.state.view}})}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onConnectProxy(){if(this.wallet?.desktop_link&&this.uri)try{this.error=!1;let{desktop_link:e,name:t}=this.wallet,{redirect:n,href:r}=a.formatNativeUrl(e,this.uri);h.setWcLinking({name:t,href:r}),h.setRecentWallet(this.wallet),a.openHref(n,`_blank`)}catch{this.error=!0}}};Jn=qn([x(`w3m-connecting-wc-desktop`)],Jn);var Yn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Xn=class extends ${constructor(){if(super(),this.btnLabelTimeout=void 0,this.redirectDeeplink=void 0,this.redirectUniversalLink=void 0,this.target=void 0,this.preferUniversalLinks=i.state.experimental_preferUniversalLinks,this.isLoading=!0,this.onConnect=()=>{ae.onConnectMobile(this.wallet)},!this.wallet)throw Error(`w3m-connecting-wc-mobile: No wallet provided`);this.secondaryBtnLabel=`Open`,this.secondaryLabel=f.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon=`externalLink`,this.onHandleURI(),this.unsubscribe.push(h.subscribeKey(`wcUri`,()=>{this.onHandleURI()})),r.sendEvent({type:`track`,event:`SELECT_WALLET`,properties:{name:this.wallet.name,platform:`mobile`,displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:l.state.view}})}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.btnLabelTimeout)}onHandleURI(){this.isLoading=!this.uri,!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onTryAgain(){h.setWcError(!1),this.onConnect?.()}};Yn([k()],Xn.prototype,`redirectDeeplink`,void 0),Yn([k()],Xn.prototype,`redirectUniversalLink`,void 0),Yn([k()],Xn.prototype,`target`,void 0),Yn([k()],Xn.prototype,`preferUniversalLinks`,void 0),Yn([k()],Xn.prototype,`isLoading`,void 0),Xn=Yn([x(`w3m-connecting-wc-mobile`)],Xn);var Zn=v`
  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e[`ease-out-power-2`]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`,Qn=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},$n=class extends ${constructor(){super(),this.basic=!1}firstUpdated(){this.basic||r.sendEvent({type:`track`,event:`SELECT_WALLET`,properties:{name:this.wallet?.name??`WalletConnect`,platform:`qrcode`,displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:l.state.view}})}disconnectedCallback(){super.disconnectedCallback(),this.unsubscribe?.forEach(e=>e())}render(){return this.onRenderProxy(),S`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${[`0`,`5`,`5`,`5`]}
        gap="5"
      >
        <wui-shimmer width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>
        <wui-text variant="lg-medium" color="primary"> Scan this QR Code with your phone </wui-text>
        ${this.copyTemplate()}
      </wui-flex>
      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0)}qrCodeTemplate(){if(!this.uri||!this.ready)return null;let e=this.wallet?this.wallet.name:void 0;h.setWcLinking(void 0),h.setRecentWallet(this.wallet);let t=ce.state.themeVariables[`--apkt-qr-color`]??ce.state.themeVariables[`--w3m-qr-color`];return S` <wui-qr-code
      theme=${ce.state.themeMode}
      uri=${this.uri}
      imageSrc=${O(s.getWalletImage(this.wallet))}
      color=${O(t)}
      alt=${O(e)}
      data-testid="wui-qr-code"
    ></wui-qr-code>`}copyTemplate(){return S`<wui-button
      .disabled=${!this.uri||!this.ready}
      @click=${this.onCopyUri}
      variant="neutral-secondary"
      size="sm"
      data-testid="copy-wc2-uri"
    >
      Copy link
      <wui-icon size="sm" color="inherit" name="copy" slot="iconRight"></wui-icon>
    </wui-button>`}};$n.styles=Zn,Qn([D({type:Boolean})],$n.prototype,`basic`,void 0),$n=Qn([x(`w3m-connecting-wc-qrcode`)],$n);var er=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},tr=class extends g{constructor(){if(super(),this.wallet=l.state.data?.wallet,!this.wallet)throw Error(`w3m-connecting-wc-unsupported: No wallet provided`);r.sendEvent({type:`track`,event:`SELECT_WALLET`,properties:{name:this.wallet.name,platform:`browser`,displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:l.state.view}})}render(){return S`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${[`10`,`5`,`5`,`5`]}
        gap="5"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${O(s.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="md-regular" color="primary">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}};tr=er([x(`w3m-connecting-wc-unsupported`)],tr);var nr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},rr=class extends ${constructor(){if(super(),this.isLoading=!0,!this.wallet)throw Error(`w3m-connecting-wc-web: No wallet provided`);this.onConnect=this.onConnectProxy.bind(this),this.secondaryBtnLabel=`Open`,this.secondaryLabel=f.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon=`externalLink`,this.updateLoadingState(),this.unsubscribe.push(h.subscribeKey(`wcUri`,()=>{this.updateLoadingState()})),r.sendEvent({type:`track`,event:`SELECT_WALLET`,properties:{name:this.wallet.name,platform:`web`,displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:l.state.view}})}updateLoadingState(){this.isLoading=!this.uri}onConnectProxy(){if(this.wallet?.webapp_link&&this.uri)try{this.error=!1;let{webapp_link:e,name:t}=this.wallet,{redirect:n,href:r}=a.formatUniversalUrl(e,this.uri);h.setWcLinking({name:t,href:r}),h.setRecentWallet(this.wallet),a.openHref(n,`_blank`)}catch{this.error=!0}}};nr([k()],rr.prototype,`isLoading`,void 0),rr=nr([x(`w3m-connecting-wc-web`)],rr);var ir=v`
  :host([data-mobile-fullscreen='true']) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :host([data-mobile-fullscreen='true']) wui-ux-by-reown {
    margin-top: auto;
  }
`,ar=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},or=class extends g{constructor(){super(),this.wallet=l.state.data?.wallet,this.unsubscribe=[],this.platform=void 0,this.platforms=[],this.isSiwxEnabled=!!i.state.siwx,this.remoteFeatures=i.state.remoteFeatures,this.displayBranding=!0,this.basic=!1,this.determinePlatforms(),this.initializeConnection(),this.unsubscribe.push(i.subscribeKey(`remoteFeatures`,e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return i.state.enableMobileFullScreen&&this.setAttribute(`data-mobile-fullscreen`,`true`),S`
      ${this.headerTemplate()}
      <div class="platform-container">${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `}reownBrandingTemplate(){return!this.remoteFeatures?.reownBranding||!this.displayBranding?null:S`<wui-ux-by-reown></wui-ux-by-reown>`}async initializeConnection(t=!1){if(!(this.platform===`browser`||i.state.manualWCControl&&!t))try{let{wcPairingExpiry:e,status:n}=h.state,{redirectView:r}=l.state.data??{};if(t||i.state.enableEmbedded||a.isPairingExpired(e)||n===`connecting`){let e=h.getConnections(p.state.activeChain),t=this.remoteFeatures?.multiWallet,n=e.length>0;await h.connectWalletConnect({cache:`never`}),this.isSiwxEnabled||(n&&t?(l.replace(`ProfileWallets`),c.showSuccess(`New Wallet Added`)):r?l.replace(r):m.close())}}catch(t){if(t instanceof Error&&t.message.includes(`An error occurred when attempting to switch chain`)&&!i.state.enableNetworkSwitch&&p.state.activeChain){p.setActiveCaipNetwork(_e.getUnsupportedNetwork(`${p.state.activeChain}:${p.state.activeCaipNetwork?.id}`)),p.showUnsupportedChainUI();return}t instanceof e&&t.originalName===te.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?r.sendEvent({type:`track`,event:`USER_REJECTED`,properties:{message:t.message}}):r.sendEvent({type:`track`,event:`CONNECT_ERROR`,properties:{message:t?.message??`Unknown`}}),h.setWcError(!0),c.showError(t.message??`Connection error`),h.resetWcConnection(),l.goBack()}}determinePlatforms(){if(!this.wallet){this.platforms.push(`qrcode`),this.platform=`qrcode`;return}if(this.platform)return;let{mobile_link:e,desktop_link:t,webapp_link:r,injected:o,rdns:s}=this.wallet,c=o?.map(({injected_id:e})=>e).filter(Boolean),l=[...s?[s]:c??[]],u=i.state.isUniversalProvider?!1:l.length,ee=e,d=r,te=h.checkInstalled(l),ne=u&&te,re=t&&!a.isMobile();ne&&!p.state.noAdapters&&this.platforms.push(`browser`),ee&&this.platforms.push(a.isMobile()?`mobile`:`qrcode`),d&&this.platforms.push(`web`),re&&this.platforms.push(`desktop`);let ie=n.isCustomDeeplinkWallet(this.wallet.id,p.state.activeChain);!ne&&u&&!p.state.noAdapters&&!ie&&this.platforms.push(`unsupported`),this.platform=this.platforms[0]}platformTemplate(){switch(this.platform){case`browser`:return S`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;case`web`:return S`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;case`desktop`:return S`
          <w3m-connecting-wc-desktop .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-desktop>
        `;case`mobile`:return S`
          <w3m-connecting-wc-mobile isMobile .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-mobile>
        `;case`qrcode`:return S`<w3m-connecting-wc-qrcode ?basic=${this.basic}></w3m-connecting-wc-qrcode>`;default:return S`<w3m-connecting-wc-unsupported></w3m-connecting-wc-unsupported>`}}headerTemplate(){return this.platforms.length>1?S`
      <w3m-connecting-header
        .platforms=${this.platforms}
        .onSelectPlatfrom=${this.onSelectPlatform.bind(this)}
      >
      </w3m-connecting-header>
    `:null}async onSelectPlatform(e){let t=this.shadowRoot?.querySelector(`div`);t&&(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:`forwards`,easing:`ease`}).finished,this.platform=e,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:`forwards`,easing:`ease`}))}};or.styles=ir,ar([k()],or.prototype,`platform`,void 0),ar([k()],or.prototype,`platforms`,void 0),ar([k()],or.prototype,`isSiwxEnabled`,void 0),ar([k()],or.prototype,`remoteFeatures`,void 0),ar([D({type:Boolean})],or.prototype,`displayBranding`,void 0),ar([D({type:Boolean})],or.prototype,`basic`,void 0),or=ar([x(`w3m-connecting-wc-view`)],or);var sr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},cr=class extends g{constructor(){super(),this.unsubscribe=[],this.isMobile=a.isMobile(),this.remoteFeatures=i.state.remoteFeatures,this.unsubscribe.push(i.subscribeKey(`remoteFeatures`,e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(this.isMobile){let{featured:e,recommended:t}=u.state,{customWallets:n}=i.state,r=o.getRecentWallets();return S`<wui-flex flexDirection="column" gap="2" .margin=${[`1`,`3`,`3`,`3`]}>
        ${e.length||t.length||n?.length||r.length?S`<w3m-connector-list></w3m-connector-list>`:null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`}return S`<wui-flex flexDirection="column" .padding=${[`0`,`0`,`4`,`0`]}>
        <w3m-connecting-wc-view ?basic=${!0} .displayBranding=${!1}></w3m-connecting-wc-view>
        <wui-flex flexDirection="column" .padding=${[`0`,`3`,`0`,`3`]}>
          <w3m-all-wallets-widget></w3m-all-wallets-widget>
        </wui-flex>
      </wui-flex>
      ${this.reownBrandingTemplate()} `}reownBrandingTemplate(){return this.remoteFeatures?.reownBranding?S` <wui-flex flexDirection="column" .padding=${[`1`,`0`,`1`,`0`]}>
      <wui-ux-by-reown></wui-ux-by-reown>
    </wui-flex>`:null}};sr([k()],cr.prototype,`isMobile`,void 0),sr([k()],cr.prototype,`remoteFeatures`,void 0),cr=sr([x(`w3m-connecting-wc-basic-view`)],cr);var lr=C`
  .continue-button-container {
    width: 100%;
  }
`,ur=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},dr=class extends g{constructor(){super(...arguments),this.loading=!1}render(){return S`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="6"
        .padding=${[`0`,`0`,`4`,`0`]}
      >
        ${this.onboardingTemplate()} ${this.buttonsTemplate()}
        <wui-link
          @click=${()=>{a.openHref(ue.URLS.FAQ,`_blank`)}}
        >
          Learn more about names
          <wui-icon color="inherit" slot="iconRight" name="externalLink"></wui-icon>
        </wui-link>
      </wui-flex>
    `}onboardingTemplate(){return S` <wui-flex
      flexDirection="column"
      gap="6"
      alignItems="center"
      .padding=${[`0`,`6`,`0`,`6`]}
    >
      <wui-flex gap="3" alignItems="center" justifyContent="center">
        <wui-icon-box icon="id" size="xl" iconSize="xxl" color="default"></wui-icon-box>
      </wui-flex>
      <wui-flex flexDirection="column" alignItems="center" gap="3">
        <wui-text align="center" variant="lg-medium" color="primary">
          Choose your account name
        </wui-text>
        <wui-text align="center" variant="md-regular" color="primary">
          Finally say goodbye to 0x addresses, name your account to make it easier to exchange
          assets
        </wui-text>
      </wui-flex>
    </wui-flex>`}buttonsTemplate(){return S`<wui-flex
      .padding=${[`0`,`8`,`0`,`8`]}
      gap="3"
      class="continue-button-container"
    >
      <wui-button
        fullWidth
        .loading=${this.loading}
        size="lg"
        borderRadius="xs"
        @click=${this.handleContinue.bind(this)}
        >Choose name
      </wui-button>
    </wui-flex>`}handleContinue(){l.push(`RegisterAccountName`),r.sendEvent({type:`track`,event:`OPEN_ENS_FLOW`,properties:{isSmartAccount:oe(p.state.activeChain)===ee.ACCOUNT_TYPES.SMART_ACCOUNT}})}};dr.styles=lr,ur([k()],dr.prototype,`loading`,void 0),dr=ur([x(`w3m-choose-account-name-view`)],dr);var fr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},pr=class extends g{constructor(){super(...arguments),this.wallet=l.state.data?.wallet}render(){if(!this.wallet)throw Error(`w3m-downloads-view`);return S`
      <wui-flex gap="2" flexDirection="column" .padding=${[`3`,`3`,`4`,`3`]}>
        ${this.chromeTemplate()} ${this.iosTemplate()} ${this.androidTemplate()}
        ${this.homepageTemplate()}
      </wui-flex>
    `}chromeTemplate(){return this.wallet?.chrome_store?S`<wui-list-item
      variant="icon"
      icon="chromeStore"
      iconVariant="square"
      @click=${this.onChromeStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Chrome Extension</wui-text>
    </wui-list-item>`:null}iosTemplate(){return this.wallet?.app_store?S`<wui-list-item
      variant="icon"
      icon="appStore"
      iconVariant="square"
      @click=${this.onAppStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">iOS App</wui-text>
    </wui-list-item>`:null}androidTemplate(){return this.wallet?.play_store?S`<wui-list-item
      variant="icon"
      icon="playStore"
      iconVariant="square"
      @click=${this.onPlayStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Android App</wui-text>
    </wui-list-item>`:null}homepageTemplate(){return this.wallet?.homepage?S`
      <wui-list-item
        variant="icon"
        icon="browser"
        iconVariant="square-blue"
        @click=${this.onHomePage.bind(this)}
        chevron
      >
        <wui-text variant="md-medium" color="primary">Website</wui-text>
      </wui-list-item>
    `:null}openStore(e){e.href&&this.wallet&&(r.sendEvent({type:`track`,event:`GET_WALLET`,properties:{name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.wallet.id,type:e.type}}),a.openHref(e.href,`_blank`))}onChromeStore(){this.wallet?.chrome_store&&this.openStore({href:this.wallet.chrome_store,type:`chrome_store`})}onAppStore(){this.wallet?.app_store&&this.openStore({href:this.wallet.app_store,type:`app_store`})}onPlayStore(){this.wallet?.play_store&&this.openStore({href:this.wallet.play_store,type:`play_store`})}onHomePage(){this.wallet?.homepage&&this.openStore({href:this.wallet.homepage,type:`homepage`})}};pr=fr([x(`w3m-downloads-view`)],pr);var mr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},hr=`https://walletguide.walletconnect.network`,gr=class extends g{render(){return S`
      <wui-flex flexDirection="column" .padding=${[`0`,`3`,`3`,`3`]} gap="2">
        ${this.recommendedWalletsTemplate()}
        <w3m-list-wallet
          name="Explore all"
          showAllWallets
          walletIcon="allWallets"
          icon="externalLink"
          size="sm"
          @click=${()=>{a.openHref(`https://walletguide.walletconnect.network/`,`_blank`)}}
        ></w3m-list-wallet>
      </wui-flex>
    `}recommendedWalletsTemplate(){let{recommended:e,featured:t}=u.state,{customWallets:n}=i.state;return[...t,...n??[],...e].slice(0,4).map((e,t)=>S`
        <w3m-list-wallet
          displayIndex=${t}
          name=${e.name??`Unknown`}
          tagVariant="accent"
          size="sm"
          imageSrc=${O(s.getWalletImage(e))}
          @click=${()=>{this.onWalletClick(e)}}
        ></w3m-list-wallet>
      `)}onWalletClick(e){r.sendEvent({type:`track`,event:`GET_WALLET`,properties:{name:e.name,walletRank:void 0,explorerId:e.id,type:`homepage`}}),a.openHref(e.homepage??hr,`_blank`)}};gr=mr([x(`w3m-get-wallet-view`)],gr);var _r=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},vr=class extends g{constructor(){super(...arguments),this.data=[]}render(){return S`
      <wui-flex flexDirection="column" alignItems="center" gap="4">
        ${this.data.map(e=>S`
            <wui-flex flexDirection="column" alignItems="center" gap="5">
              <wui-flex flexDirection="row" justifyContent="center" gap="1">
                ${e.images.map(e=>S`<wui-visual size="sm" name=${e}></wui-visual>`)}
              </wui-flex>
            </wui-flex>
            <wui-flex flexDirection="column" alignItems="center" gap="1">
              <wui-text variant="md-regular" color="primary" align="center">${e.title}</wui-text>
              <wui-text variant="sm-regular" color="secondary" align="center"
                >${e.text}</wui-text
              >
            </wui-flex>
          `)}
      </wui-flex>
    `}};_r([D({type:Array})],vr.prototype,`data`,void 0),vr=_r([x(`w3m-help-widget`)],vr);var yr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},br=[{images:[`login`,`profile`,`lock`],title:`One login for all of web3`,text:`Log in to any app by connecting your wallet. Say goodbye to countless passwords!`},{images:[`defi`,`nft`,`eth`],title:`A home for your digital assets`,text:`A wallet lets you store, send and receive digital assets like cryptocurrencies and NFTs.`},{images:[`browser`,`noun`,`dao`],title:`Your gateway to a new web`,text:`With your wallet, you can explore and interact with DeFi, NFTs, DAOs, and much more.`}],xr=class extends g{render(){return S`
      <wui-flex
        flexDirection="column"
        .padding=${[`6`,`5`,`5`,`5`]}
        alignItems="center"
        gap="5"
      >
        <w3m-help-widget .data=${br}></w3m-help-widget>
        <wui-button variant="accent-primary" size="md" @click=${this.onGetWallet.bind(this)}>
          <wui-icon color="inherit" slot="iconLeft" name="wallet"></wui-icon>
          Get a wallet
        </wui-button>
      </wui-flex>
    `}onGetWallet(){r.sendEvent({type:`track`,event:`CLICK_GET_WALLET_HELP`}),l.push(`GetWallet`)}};xr=yr([x(`w3m-what-is-a-wallet-view`)],xr);var Sr=v`
  wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    transition: opacity ${({durations:e})=>e.lg}
      ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: opacity;
  }
  wui-flex::-webkit-scrollbar {
    display: none;
  }
  wui-flex.disabled {
    opacity: 0.3;
    pointer-events: none;
    user-select: none;
  }
`,Cr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},wr=class extends g{constructor(){super(),this.unsubscribe=[],this.checked=pe.state.isLegalCheckboxChecked,this.unsubscribe.push(pe.subscribeKey(`isLegalCheckboxChecked`,e=>{this.checked=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let{termsConditionsUrl:e,privacyPolicyUrl:t}=i.state,n=i.state.features?.legalCheckbox,r=!!(e||t)&&!!n,a=r&&!this.checked,o=a?-1:void 0;return S`
      <w3m-legal-checkbox></w3m-legal-checkbox>
      <wui-flex
        flexDirection="column"
        .padding=${r?[`0`,`3`,`3`,`3`]:`3`}
        gap="2"
        class=${O(a?`disabled`:void 0)}
      >
        <w3m-wallet-login-list tabIdx=${O(o)}></w3m-wallet-login-list>
      </wui-flex>
    `}};wr.styles=Sr,Cr([k()],wr.prototype,`checked`,void 0),wr=Cr([x(`w3m-connect-wallets-view`)],wr);var Tr=v`
  :host {
    display: block;
    width: 120px;
    height: 120px;
  }

  svg {
    width: 120px;
    height: 120px;
    fill: none;
    stroke: transparent;
    stroke-linecap: round;
  }

  use {
    stroke: ${e=>e.colors.accent100};
    stroke-width: 2px;
    stroke-dasharray: 54, 118;
    stroke-dashoffset: 172;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 0px;
    }
  }
`,Er=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Dr=class extends g{render(){return S`
      <svg viewBox="0 0 54 59">
        <path
          id="wui-loader-path"
          d="M17.22 5.295c3.877-2.277 5.737-3.363 7.72-3.726a11.44 11.44 0 0 1 4.12 0c1.983.363 3.844 1.45 7.72 3.726l6.065 3.562c3.876 2.276 5.731 3.372 7.032 4.938a11.896 11.896 0 0 1 2.06 3.63c.683 1.928.688 4.11.688 8.663v7.124c0 4.553-.005 6.735-.688 8.664a11.896 11.896 0 0 1-2.06 3.63c-1.3 1.565-3.156 2.66-7.032 4.937l-6.065 3.563c-3.877 2.276-5.737 3.362-7.72 3.725a11.46 11.46 0 0 1-4.12 0c-1.983-.363-3.844-1.449-7.72-3.726l-6.065-3.562c-3.876-2.276-5.731-3.372-7.032-4.938a11.885 11.885 0 0 1-2.06-3.63c-.682-1.928-.688-4.11-.688-8.663v-7.124c0-4.553.006-6.735.688-8.664a11.885 11.885 0 0 1 2.06-3.63c1.3-1.565 3.156-2.66 7.032-4.937l6.065-3.562Z"
        />
        <use xlink:href="#wui-loader-path"></use>
      </svg>
    `}};Dr.styles=[y,Tr],Dr=Er([x(`wui-loading-hexagon`)],Dr);var Or=C`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-loading-hexagon {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: 4px;
    bottom: 0;
    opacity: 0;
    transform: scale(0.5);
    z-index: 1;
  }

  wui-button {
    display: none;
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  wui-button[data-retry='true'] {
    display: block;
    opacity: 1;
  }
`,kr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Ar=class extends g{constructor(){super(),this.network=l.state.data?.network,this.unsubscribe=[],this.showRetry=!1,this.error=!1}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}firstUpdated(){this.onSwitchNetwork()}render(){if(!this.network)throw Error(`w3m-network-switch-view: No network provided`);this.onShowRetry();let e=this.getLabel(),t=this.getSubLabel();return S`
      <wui-flex
        data-error=${this.error}
        flexDirection="column"
        alignItems="center"
        .padding=${[`10`,`5`,`10`,`5`]}
        gap="7"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-network-image
            size="lg"
            imageSrc=${O(s.getNetworkImage(this.network))}
          ></wui-network-image>

          ${this.error?null:S`<wui-loading-hexagon></wui-loading-hexagon>`}

          <wui-icon-box color="error" icon="close" size="sm"></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="2">
          <wui-text align="center" variant="h6-regular" color="primary">${e}</wui-text>
          <wui-text align="center" variant="md-regular" color="secondary">${t}</wui-text>
        </wui-flex>

        <wui-button
          data-retry=${this.showRetry}
          variant="accent-primary"
          size="md"
          .disabled=${!this.error}
          @click=${this.onSwitchNetwork.bind(this)}
        >
          <wui-icon color="inherit" slot="iconLeft" name="refresh"></wui-icon>
          Try again
        </wui-button>
      </wui-flex>
    `}getSubLabel(){let e=d.getConnectorId(p.state.activeChain);return d.getAuthConnector()&&e===w.CONNECTOR_ID.AUTH?``:this.error?`Switch can be declined if chain is not supported by a wallet or previous request is still active`:`Accept connection request in your wallet`}getLabel(){let e=d.getConnectorId(p.state.activeChain);return d.getAuthConnector()&&e===w.CONNECTOR_ID.AUTH?`Switching to ${this.network?.name??`Unknown`} network...`:this.error?`Switch declined`:`Approve in wallet`}onShowRetry(){this.error&&!this.showRetry&&(this.showRetry=!0,(this.shadowRoot?.querySelector(`wui-button`))?.animate([{opacity:0},{opacity:1}],{fill:`forwards`,easing:`ease`}))}async onSwitchNetwork(){try{this.error=!1,p.state.activeChain!==this.network?.chainNamespace&&p.setIsSwitchingNamespace(!0),this.network&&(await p.switchActiveNetwork(this.network),await me.isAuthenticated()&&l.goBack())}catch{this.error=!0}}};Ar.styles=Or,kr([k()],Ar.prototype,`showRetry`,void 0),kr([k()],Ar.prototype,`error`,void 0),Ar=kr([x(`w3m-network-switch-view`)],Ar);var jr=v`
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
`,Mr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Nr=class extends g{constructor(){super(...arguments),this.imageSrc=void 0,this.name=`Ethereum`,this.disabled=!1}render(){return S`
      <button ?disabled=${this.disabled} tabindex=${O(this.tabIdx)}>
        <wui-flex gap="2" alignItems="center">
          ${this.imageTemplate()}
          <wui-text variant="lg-regular" color="primary">${this.name}</wui-text>
        </wui-flex>
        <wui-icon name="chevronRight" size="lg" color="default"></wui-icon>
      </button>
    `}imageTemplate(){return this.imageSrc?S`<wui-image ?boxed=${!0} src=${this.imageSrc}></wui-image>`:S`<wui-image
      ?boxed=${!0}
      icon="networkPlaceholder"
      size="lg"
      iconColor="default"
    ></wui-image>`}};Nr.styles=[y,_,jr],Mr([D()],Nr.prototype,`imageSrc`,void 0),Mr([D()],Nr.prototype,`name`,void 0),Mr([D()],Nr.prototype,`tabIdx`,void 0),Mr([D({type:Boolean})],Nr.prototype,`disabled`,void 0),Nr=Mr([x(`wui-list-network`)],Nr);var Pr=C`
  .container {
    max-height: 360px;
    overflow: auto;
  }

  .container::-webkit-scrollbar {
    display: none;
  }
`,Fr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Ir=class extends g{constructor(){super(),this.unsubscribe=[],this.network=p.state.activeCaipNetwork,this.requestedCaipNetworks=p.getCaipNetworks(),this.search=``,this.onDebouncedSearch=a.debounce(e=>{this.search=e},100),this.unsubscribe.push(ne.subscribeNetworkImages(()=>this.requestUpdate()),p.subscribeKey(`activeCaipNetwork`,e=>this.network=e),p.subscribe(()=>{this.requestedCaipNetworks=p.getAllRequestedCaipNetworks()}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return S`
      ${this.templateSearchInput()}
      <wui-flex
        class="container"
        .padding=${[`0`,`3`,`3`,`3`]}
        flexDirection="column"
        gap="2"
      >
        ${this.networksTemplate()}
      </wui-flex>
    `}templateSearchInput(){return S`
      <wui-flex gap="2" .padding=${[`0`,`3`,`3`,`3`]}>
        <wui-input-text
          @inputChange=${this.onInputChange.bind(this)}
          class="network-search-input"
          size="md"
          placeholder="Search network"
          icon="search"
        ></wui-input-text>
      </wui-flex>
    `}onInputChange(e){this.onDebouncedSearch(e.detail)}networksTemplate(){let e=p.getAllApprovedCaipNetworkIds(),t=a.sortRequestedNetworks(e,this.requestedCaipNetworks);return this.search?this.filteredNetworks=t?.filter(e=>e?.name?.toLowerCase().includes(this.search.toLowerCase())):this.filteredNetworks=t,this.filteredNetworks?.map(e=>S`
        <wui-list-network
          .selected=${this.network?.id===e.id}
          imageSrc=${O(s.getNetworkImage(e))}
          type="network"
          name=${e.name??e.id}
          @click=${()=>this.onSwitchNetwork(e)}
          .disabled=${p.isCaipNetworkDisabled(e)}
          data-testid=${`w3m-network-switch-${e.name??e.id}`}
        ></wui-list-network>
      `)}onSwitchNetwork(e){re.onSwitchNetwork({network:e})}};Ir.styles=Pr,Fr([k()],Ir.prototype,`network`,void 0),Fr([k()],Ir.prototype,`requestedCaipNetworks`,void 0),Fr([k()],Ir.prototype,`filteredNetworks`,void 0),Fr([k()],Ir.prototype,`search`,void 0),Ir=Fr([x(`w3m-networks-view`)],Ir);var Lr=v`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-visual {
    border-radius: calc(
      ${({borderRadius:e})=>e[1]} * 9 - ${({borderRadius:e})=>e[3]}
    );
    position: relative;
    overflow: hidden;
  }

  wui-visual::after {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    border-radius: calc(
      ${({borderRadius:e})=>e[1]} * 9 - ${({borderRadius:e})=>e[3]}
    );
    box-shadow: inset 0 0 0 1px ${({tokens:e})=>e.core.glass010};
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({spacing:e})=>e[1]} * -1);
    bottom: calc(${({spacing:e})=>e[1]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition:
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e[`ease-out-power-2`]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({spacing:e})=>e[4]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({easings:e})=>e[`ease-out-power-2`]} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  wui-link {
    padding: ${({spacing:e})=>e[`01`]} ${({spacing:e})=>e[2]};
  }

  .capitalize {
    text-transform: capitalize;
  }
`,Rr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},zr={eip155:`eth`,solana:`solana`,bip122:`bitcoin`,polkadot:void 0},Br=class extends g{constructor(){super(...arguments),this.unsubscribe=[],this.switchToChain=l.state.data?.switchToChain,this.caipNetwork=l.state.data?.network,this.activeChain=p.state.activeChain}firstUpdated(){this.unsubscribe.push(p.subscribeKey(`activeChain`,e=>this.activeChain=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=this.switchToChain?w.CHAIN_NAME_MAP[this.switchToChain]:`supported`;if(!this.switchToChain)return null;let t=w.CHAIN_NAME_MAP[this.switchToChain];return S`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${[`4`,`2`,`2`,`2`]}
        gap="4"
      >
        <wui-flex justifyContent="center" flexDirection="column" alignItems="center" gap="2">
          <wui-visual
            size="md"
            name=${O(zr[this.switchToChain])}
          ></wui-visual>
          <wui-flex gap="2" flexDirection="column" alignItems="center">
            <wui-text
              data-testid=${`w3m-switch-active-chain-to-${t}`}
              variant="lg-regular"
              color="primary"
              align="center"
              >Switch to <span class="capitalize">${t}</span></wui-text
            >
            <wui-text variant="md-regular" color="secondary" align="center">
              Connected wallet doesn't support connecting to ${e} chain. You
              need to connect with a different wallet.
            </wui-text>
          </wui-flex>
          <wui-button
            data-testid="w3m-switch-active-chain-button"
            size="md"
            @click=${this.switchActiveChain.bind(this)}
            >Switch</wui-button
          >
        </wui-flex>
      </wui-flex>
    `}async switchActiveChain(){this.switchToChain&&(p.setIsSwitchingNamespace(!0),d.setFilterByNamespace(this.switchToChain),this.caipNetwork?await p.switchActiveNetwork(this.caipNetwork):p.setActiveNamespace(this.switchToChain),l.reset(`Connect`))}};Br.styles=Lr,Rr([D()],Br.prototype,`activeChain`,void 0),Br=Rr([x(`w3m-switch-active-chain-view`)],Br);var Vr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Hr=[{images:[`network`,`layers`,`system`],title:`The system’s nuts and bolts`,text:`A network is what brings the blockchain to life, as this technical infrastructure allows apps to access the ledger and smart contract services.`},{images:[`noun`,`defiAlt`,`dao`],title:`Designed for different uses`,text:`Each network is designed differently, and may therefore suit certain apps and experiences.`}],Ur=class extends g{render(){return S`
      <wui-flex
        flexDirection="column"
        .padding=${[`6`,`5`,`5`,`5`]}
        alignItems="center"
        gap="5"
      >
        <w3m-help-widget .data=${Hr}></w3m-help-widget>
        <wui-button
          variant="accent-primary"
          size="md"
          @click=${()=>{a.openHref(`https://ethereum.org/en/developers/docs/networks/`,`_blank`)}}
        >
          Learn more
          <wui-icon color="inherit" slot="iconRight" name="externalLink"></wui-icon>
        </wui-button>
      </wui-flex>
    `}};Ur=Vr([x(`w3m-what-is-a-network-view`)],Ur);var Wr=C`
  :host > wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
  }

  :host > wui-flex::-webkit-scrollbar {
    display: none;
  }
`,Gr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Kr=class extends g{constructor(){super(),this.swapUnsupportedChain=l.state.data?.swapUnsupportedChain,this.unsubscribe=[],this.disconnecting=!1,this.remoteFeatures=i.state.remoteFeatures,this.unsubscribe.push(ne.subscribeNetworkImages(()=>this.requestUpdate()),i.subscribeKey(`remoteFeatures`,e=>{this.remoteFeatures=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return S`
      <wui-flex class="container" flexDirection="column" gap="0">
        <wui-flex
          class="container"
          flexDirection="column"
          .padding=${[`3`,`5`,`2`,`5`]}
          alignItems="center"
          gap="5"
        >
          ${this.descriptionTemplate()}
        </wui-flex>

        <wui-flex flexDirection="column" padding="3" gap="2"> ${this.networksTemplate()} </wui-flex>

        <wui-separator text="or"></wui-separator>
        <wui-flex flexDirection="column" padding="3" gap="2">
          <wui-list-item
            variant="icon"
            iconVariant="overlay"
            icon="signOut"
            ?chevron=${!1}
            .loading=${this.disconnecting}
            @click=${this.onDisconnect.bind(this)}
            data-testid="disconnect-button"
          >
            <wui-text variant="md-medium" color="secondary">Disconnect</wui-text>
          </wui-list-item>
        </wui-flex>
      </wui-flex>
    `}descriptionTemplate(){return this.swapUnsupportedChain?S`
        <wui-text variant="sm-regular" color="secondary" align="center">
          The swap feature doesn’t support your current network. Switch to an available option to
          continue.
        </wui-text>
      `:S`
      <wui-text variant="sm-regular" color="secondary" align="center">
        This app doesn’t support your current network. Switch to an available option to continue.
      </wui-text>
    `}networksTemplate(){let e=p.getAllRequestedCaipNetworks(),t=p.getAllApprovedCaipNetworkIds(),n=a.sortRequestedNetworks(t,e);return(this.swapUnsupportedChain?n.filter(e=>f.SWAP_SUPPORTED_NETWORKS.includes(e.caipNetworkId)):n).map(e=>S`
        <wui-list-network
          imageSrc=${O(s.getNetworkImage(e))}
          name=${e.name??`Unknown`}
          @click=${()=>this.onSwitchNetwork(e)}
        >
        </wui-list-network>
      `)}async onDisconnect(){try{this.disconnecting=!0;let e=p.state.activeChain,t=h.getConnections(e).length>0,n=e&&d.state.activeConnectorIds[e],r=this.remoteFeatures?.multiWallet;await h.disconnect(r?{id:n,namespace:e}:{}),t&&r&&(l.push(`ProfileWallets`),c.showSuccess(`Wallet deleted`))}catch{r.sendEvent({type:`track`,event:`DISCONNECT_ERROR`,properties:{message:`Failed to disconnect`}}),c.showError(`Failed to disconnect`)}finally{this.disconnecting=!1}}async onSwitchNetwork(e){let t=p.getActiveCaipAddress(),n=p.getAllApprovedCaipNetworkIds();p.getNetworkProp(`supportsAllNetworks`,e.chainNamespace);let r=l.state.data;t?n?.includes(e.caipNetworkId)?await p.switchActiveNetwork(e):l.push(`SwitchNetwork`,{...r,network:e}):t||(p.setActiveCaipNetwork(e),l.push(`Connect`))}};Kr.styles=Wr,Gr([k()],Kr.prototype,`disconnecting`,void 0),Gr([k()],Kr.prototype,`remoteFeatures`,void 0),Kr=Gr([x(`w3m-unsupported-chain-view`)],Kr);var qr=v`
  wui-flex {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[4]};
    padding: ${({spacing:e})=>e[3]};
  }

  /* -- Types --------------------------------------------------------- */
  wui-flex[data-type='info'] {
    color: ${({tokens:e})=>e.theme.textSecondary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  wui-flex[data-type='success'] {
    color: ${({tokens:e})=>e.core.textSuccess};
    background-color: ${({tokens:e})=>e.core.backgroundSuccess};
  }

  wui-flex[data-type='error'] {
    color: ${({tokens:e})=>e.core.textError};
    background-color: ${({tokens:e})=>e.core.backgroundError};
  }

  wui-flex[data-type='warning'] {
    color: ${({tokens:e})=>e.core.textWarning};
    background-color: ${({tokens:e})=>e.core.backgroundWarning};
  }

  wui-flex[data-type='info'] wui-icon-box {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  wui-flex[data-type='success'] wui-icon-box {
    background-color: ${({tokens:e})=>e.core.backgroundSuccess};
  }

  wui-flex[data-type='error'] wui-icon-box {
    background-color: ${({tokens:e})=>e.core.backgroundError};
  }

  wui-flex[data-type='warning'] wui-icon-box {
    background-color: ${({tokens:e})=>e.core.backgroundWarning};
  }

  wui-text {
    flex: 1;
  }
`,Jr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Yr=class extends g{constructor(){super(...arguments),this.icon=`externalLink`,this.text=``,this.type=`info`}render(){return S`
      <wui-flex alignItems="center" data-type=${this.type}>
        <wui-icon-box size="sm" color="inherit" icon=${this.icon}></wui-icon-box>
        <wui-text variant="md-regular" color="inherit">${this.text}</wui-text>
      </wui-flex>
    `}};Yr.styles=[y,_,qr],Jr([D()],Yr.prototype,`icon`,void 0),Jr([D()],Yr.prototype,`text`,void 0),Jr([D()],Yr.prototype,`type`,void 0),Yr=Jr([x(`wui-banner`)],Yr);var Xr=C`
  :host > wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
  }

  :host > wui-flex::-webkit-scrollbar {
    display: none;
  }
`,Zr=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Qr=class extends g{constructor(){super(),this.unsubscribe=[]}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return S` <wui-flex flexDirection="column" .padding=${[`2`,`3`,`3`,`3`]} gap="2">
      <wui-banner
        icon="warningCircle"
        text="You can only receive assets on these networks"
      ></wui-banner>
      ${this.networkTemplate()}
    </wui-flex>`}networkTemplate(){let e=p.getAllRequestedCaipNetworks(),t=p.getAllApprovedCaipNetworkIds(),n=p.state.activeCaipNetwork,r=p.checkIfSmartAccountEnabled(),i=a.sortRequestedNetworks(t,e);if(r&&oe(n?.chainNamespace)===ee.ACCOUNT_TYPES.SMART_ACCOUNT){if(!n)return null;i=[n]}return i.filter(e=>e.chainNamespace===n?.chainNamespace).map(e=>S`
        <wui-list-network
          imageSrc=${O(s.getNetworkImage(e))}
          name=${e.name??`Unknown`}
          ?transparent=${!0}
        >
        </wui-list-network>
      `)}};Qr.styles=Xr,Qr=Zr([x(`w3m-wallet-compatible-networks-view`)],Qr);var $r=v`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 56px;
    height: 56px;
    box-shadow: 0 0 0 8px ${({tokens:e})=>e.theme.borderPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
    overflow: hidden;
  }

  :host([data-border-radius-full='true']) {
    border-radius: 50px;
  }

  wui-icon {
    font-size: 48px;
  }
`,ei=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},ti=class extends g{render(){return this.dataset.borderRadiusFull=this.borderRadiusFull?`true`:`false`,S`${this.templateVisual()}`}templateVisual(){return this.imageSrc?S`<wui-image src=${this.imageSrc} alt=${this.alt??``}></wui-image>`:S`<wui-icon
      data-parent-size="md"
      size="inherit"
      color="inherit"
      name="wallet"
    ></wui-icon>`}};ti.styles=[y,$r],ei([D()],ti.prototype,`imageSrc`,void 0),ei([D()],ti.prototype,`alt`,void 0),ei([D({type:Boolean})],ti.prototype,`borderRadiusFull`,void 0),ti=ei([x(`wui-visual-thumbnail`)],ti);var ni=v`
  :host {
    display: flex;
    justify-content: center;
    gap: ${({spacing:e})=>e[4]};
  }

  wui-visual-thumbnail:nth-child(1) {
    z-index: 1;
  }
`,ri=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},ii=class extends g{constructor(){super(...arguments),this.dappImageUrl=i.state.metadata?.icons,this.walletImageUrl=p.getAccountData()?.connectedWalletInfo?.icon}firstUpdated(){let e=this.shadowRoot?.querySelectorAll(`wui-visual-thumbnail`);e?.[0]&&this.createAnimation(e[0],`translate(18px)`),e?.[1]&&this.createAnimation(e[1],`translate(-18px)`)}render(){return S`
      <wui-visual-thumbnail
        ?borderRadiusFull=${!0}
        .imageSrc=${this.dappImageUrl?.[0]}
      ></wui-visual-thumbnail>
      <wui-visual-thumbnail .imageSrc=${this.walletImageUrl}></wui-visual-thumbnail>
    `}createAnimation(e,t){e.animate([{transform:`translateX(0px)`},{transform:t}],{duration:1600,easing:`cubic-bezier(0.56, 0, 0.48, 1)`,direction:`alternate`,iterations:1/0})}};ii.styles=ni,ii=ri([x(`w3m-siwx-sign-message-thumbnails`)],ii);var ai=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},oi=class extends g{constructor(){super(...arguments),this.dappName=i.state.metadata?.name,this.isCancelling=!1,this.isSigning=!1}render(){return S`
      <wui-flex justifyContent="center" .padding=${[`8`,`0`,`6`,`0`]}>
        <w3m-siwx-sign-message-thumbnails></w3m-siwx-sign-message-thumbnails>
      </wui-flex>
      <wui-flex .padding=${[`0`,`20`,`5`,`20`]} gap="3" justifyContent="space-between">
        <wui-text variant="lg-medium" align="center" color="primary"
          >${this.dappName??`Dapp`} needs to connect to your wallet</wui-text
        >
      </wui-flex>
      <wui-flex .padding=${[`0`,`10`,`4`,`10`]} gap="3" justifyContent="space-between">
        <wui-text variant="md-regular" align="center" color="secondary"
          >Sign this message to prove you own this wallet and proceed. Canceling will disconnect
          you.</wui-text
        >
      </wui-flex>
      <wui-flex .padding=${[`4`,`5`,`5`,`5`]} gap="3" justifyContent="space-between">
        <wui-button
          size="lg"
          borderRadius="xs"
          fullWidth
          variant="neutral-secondary"
          ?loading=${this.isCancelling}
          @click=${this.onCancel.bind(this)}
          data-testid="w3m-connecting-siwe-cancel"
        >
          ${this.isCancelling?`Cancelling...`:`Cancel`}
        </wui-button>
        <wui-button
          size="lg"
          borderRadius="xs"
          fullWidth
          variant="neutral-primary"
          @click=${this.onSign.bind(this)}
          ?loading=${this.isSigning}
          data-testid="w3m-connecting-siwe-sign"
        >
          ${this.isSigning?`Signing...`:`Sign`}
        </wui-button>
      </wui-flex>
    `}async onSign(){this.isSigning=!0;try{await me.requestSignMessage()}catch(e){if(e instanceof Error&&e.message.includes(`OTP is required`)){c.showError({message:`Something went wrong. We need to verify your account again.`}),l.replace(`DataCapture`);return}throw e}finally{this.isSigning=!1}}async onCancel(){this.isCancelling=!0,await me.cancelSignMessage().finally(()=>this.isCancelling=!1)}};ai([k()],oi.prototype,`isCancelling`,void 0),ai([k()],oi.prototype,`isSigning`,void 0),oi=ai([x(`w3m-siwx-sign-message-view`)],oi);export{Oe as AppKitAccountButton,je as AppKitButton,Re as AppKitConnectButton,Ke as AppKitNetworkButton,De as W3mAccountButton,$e as W3mAccountSettingsView,Dt as W3mAccountView,sn as W3mAllWalletsView,Ae as W3mButton,dr as W3mChooseAccountNameView,Le as W3mConnectButton,Z as W3mConnectView,wr as W3mConnectWalletsView,zn as W3mConnectingExternalView,Hn as W3mConnectingMultiChainView,cr as W3mConnectingWcBasicView,or as W3mConnectingWcView,pr as W3mDownloadsView,we as W3mFooter,It as W3mFundWalletView,gr as W3mGetWalletView,Ge as W3mNetworkButton,Ar as W3mNetworkSwitchView,Ir as W3mNetworksView,K as W3mProfileWalletsView,Te as W3mRouter,oi as W3mSIWXSignMessageView,Br as W3mSwitchActiveChainView,Kr as W3mUnsupportedChainView,Qr as W3mWalletCompatibleNetworksView,Ur as W3mWhatIsANetworkView,xr as W3mWhatIsAWalletView};