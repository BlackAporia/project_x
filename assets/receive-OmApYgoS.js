import{G as e,O as t,P as n,S as r,W as i,r as a,v as o,x as s}from"./ModalController-293ZqF5Y.js";import{f as c,i as l,l as u,o as d,r as f,t as p,v as m}from"./exports-DhpXOCRA.js";import{c as h,o as g,s as _}from"./wui-text-BrRr1pD5.js";import"./wui-image-CTVdD8em.js";import"./wui-qr-code-DwKZa51s.js";var v=u`
  button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({spacing:e})=>e[4]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[3]};
    border: none;
    padding: ${({spacing:e})=>e[3]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button:hover:enabled,
  button:active:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  wui-text {
    flex: 1;
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  wui-flex {
    width: auto;
    display: flex;
    align-items: center;
    gap: ${({spacing:e})=>e[`01`]};
  }

  wui-icon {
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  .network-icon {
    position: relative;
    width: 20px;
    height: 20px;
    border-radius: ${({borderRadius:e})=>e[4]};
    overflow: hidden;
    margin-left: -8px;
  }

  .network-icon:first-child {
    margin-left: 0px;
  }

  .network-icon:after {
    position: absolute;
    inset: 0;
    content: '';
    display: block;
    height: 100%;
    width: 100%;
    border-radius: ${({borderRadius:e})=>e[4]};
    box-shadow: inset 0 0 0 1px ${({tokens:e})=>e.core.glass010};
  }
`,y=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},b=class extends c{constructor(){super(...arguments),this.networkImages=[``],this.text=``}render(){return m`
      <button>
        <wui-text variant="md-regular" color="inherit">${this.text}</wui-text>
        <wui-flex>
          ${this.networksTemplate()}
          <wui-icon name="chevronRight" size="sm" color="inherit"></wui-icon>
        </wui-flex>
      </button>
    `}networksTemplate(){return m` <wui-flex class="networks">
      ${this.networkImages.slice(0,5)?.map(e=>m` <wui-flex class="network-icon"> <wui-image src=${e}></wui-image> </wui-flex>`)}
    </wui-flex>`}};b.styles=[d,l,v],y([h({type:Array})],b.prototype,`networkImages`,void 0),y([h()],b.prototype,`text`,void 0),b=y([p(`wui-compatible-network`)],b);var x=u`
  wui-compatible-network {
    margin-top: ${({spacing:e})=>e[4]};
    width: 100%;
  }

  wui-qr-code {
    width: unset !important;
    height: unset !important;
  }

  wui-icon {
    align-items: normal;
  }
`,S=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},C=class extends c{constructor(){super(),this.unsubscribe=[],this.address=a.getAccountData()?.address,this.profileName=a.getAccountData()?.profileName,this.network=a.state.activeCaipNetwork,this.unsubscribe.push(a.subscribeChainProp(`accountState`,e=>{e?(this.address=e.address,this.profileName=e.profileName):n.showError(`Account not found`)}),a.subscribeKey(`activeCaipNetwork`,e=>{e?.id&&(this.network=e)}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(!this.address)throw Error(`w3m-wallet-receive-view: No account provided`);let e=t.getNetworkImage(this.network);return m` <wui-flex
      flexDirection="column"
      .padding=${[`0`,`4`,`4`,`4`]}
      alignItems="center"
    >
      <wui-chip-button
        data-testid="receive-address-copy-button"
        @click=${this.onCopyClick.bind(this)}
        text=${f.getTruncateString({string:this.profileName||this.address||``,charsStart:this.profileName?18:4,charsEnd:this.profileName?0:4,truncate:this.profileName?`end`:`middle`})}
        icon="copy"
        size="sm"
        imageSrc=${e||``}
        variant="gray"
      ></wui-chip-button>
      <wui-flex
        flexDirection="column"
        .padding=${[`4`,`0`,`0`,`0`]}
        alignItems="center"
        gap="4"
      >
        <wui-qr-code
          size=${232}
          theme=${s.state.themeMode}
          uri=${this.address}
          ?arenaClear=${!0}
          color=${g(s.state.themeVariables[`--apkt-qr-color`]??s.state.themeVariables[`--w3m-qr-color`])}
          data-testid="wui-qr-code"
        ></wui-qr-code>
        <wui-text variant="lg-regular" color="primary" align="center">
          Copy your address or scan this QR code
        </wui-text>
        <wui-button @click=${this.onCopyClick.bind(this)} size="sm" variant="neutral-secondary">
          <wui-icon slot="iconLeft" size="sm" color="inherit" name="copy"></wui-icon>
          <wui-text variant="md-regular" color="inherit">Copy address</wui-text>
        </wui-button>
      </wui-flex>
      ${this.networkTemplate()}
    </wui-flex>`}networkTemplate(){let e=a.getAllRequestedCaipNetworks(),n=a.checkIfSmartAccountEnabled(),r=a.state.activeCaipNetwork,s=e.filter(e=>e?.chainNamespace===r?.chainNamespace);if(o(r?.chainNamespace)===i.ACCOUNT_TYPES.SMART_ACCOUNT&&n)return r?m`<wui-compatible-network
        @click=${this.onReceiveClick.bind(this)}
        text="Only receive assets on this network"
        .networkImages=${[t.getNetworkImage(r)??``]}
      ></wui-compatible-network>`:null;let c=(s?.filter(e=>e?.assets?.imageId)?.slice(0,5)).map(t.getNetworkImage).filter(Boolean);return m`<wui-compatible-network
      @click=${this.onReceiveClick.bind(this)}
      text="Only receive assets on these networks"
      .networkImages=${c}
    ></wui-compatible-network>`}onReceiveClick(){r.push(`WalletCompatibleNetworks`)}onCopyClick(){try{this.address&&(e.copyToClopboard(this.address),n.showSuccess(`Address copied`))}catch{n.showError(`Failed to copy`)}}};C.styles=x,S([_()],C.prototype,`address`,void 0),S([_()],C.prototype,`profileName`,void 0),S([_()],C.prototype,`network`,void 0),C=S([p(`w3m-wallet-receive-view`)],C);export{C as W3mWalletReceiveView};