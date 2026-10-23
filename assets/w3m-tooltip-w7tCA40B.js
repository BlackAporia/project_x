import{S as e,t}from"./ModalController-293ZqF5Y.js";import{f as n,l as r,t as i,v as a,x as o}from"./exports-DhpXOCRA.js";import{f as s}from"./exports-psidwoNx.js";import{c,s as l}from"./wui-text-BrRr1pD5.js";import"./wui-icon-B2_zdvX4.js";var u=o`
  :host {
    width: 100%;
    display: block;
  }
`,d=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},f=class extends n{constructor(){super(),this.unsubscribe=[],this.text=``,this.open=s.state.open,this.unsubscribe.push(e.subscribeKey(`view`,()=>{s.hide()}),t.subscribeKey(`open`,e=>{e||s.hide()}),s.subscribeKey(`open`,e=>{this.open=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),s.hide()}render(){return a`
      <div
        @pointermove=${this.onMouseEnter.bind(this)}
        @pointerleave=${this.onMouseLeave.bind(this)}
      >
        ${this.renderChildren()}
      </div>
    `}renderChildren(){return a`<slot></slot> `}onMouseEnter(){let e=this.getBoundingClientRect();if(!this.open){let t=document.querySelector(`w3m-modal`),n={width:e.width,height:e.height,left:e.left,top:e.top};if(t){let r=t.getBoundingClientRect();n.left=e.left-(window.innerWidth-r.width)/2,n.top=e.top-(window.innerHeight-r.height)/2}s.showTooltip({message:this.text,triggerRect:n,variant:`shade`})}}onMouseLeave(e){this.contains(e.relatedTarget)||s.hide()}};f.styles=[u],d([c()],f.prototype,`text`,void 0),d([l()],f.prototype,`open`,void 0),f=d([i(`w3m-tooltip-trigger`)],f);var p=r`
  :host {
    pointer-events: none;
  }

  :host > wui-flex {
    display: var(--w3m-tooltip-display);
    opacity: var(--w3m-tooltip-opacity);
    padding: 9px ${({spacing:e})=>e[3]} 10px ${({spacing:e})=>e[3]};
    border-radius: ${({borderRadius:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.backgroundPrimary};
    position: absolute;
    top: var(--w3m-tooltip-top);
    left: var(--w3m-tooltip-left);
    transform: translate(calc(-50% + var(--w3m-tooltip-parent-width)), calc(-100% - 8px));
    max-width: calc(var(--apkt-modal-width) - ${({spacing:e})=>e[5]});
    transition: opacity ${({durations:e})=>e.lg}
      ${({easings:e})=>e[`ease-out-power-2`]};
    will-change: opacity;
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e[`ease-out-power-2`]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  :host([data-variant='shade']) > wui-flex {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  :host([data-variant='shade']) > wui-flex > wui-text {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  :host([data-variant='fill']) > wui-flex {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
    color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

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

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`,m=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},h=class extends n{constructor(){super(),this.unsubscribe=[],this.open=s.state.open,this.message=s.state.message,this.triggerRect=s.state.triggerRect,this.variant=s.state.variant,this.unsubscribe.push(s.subscribe(e=>{this.open=e.open,this.message=e.message,this.triggerRect=e.triggerRect,this.variant=e.variant}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){this.dataset.variant=this.variant;let e=this.triggerRect.top,t=this.triggerRect.left;return this.style.cssText=`
    --w3m-tooltip-top: ${e}px;
    --w3m-tooltip-left: ${t}px;
    --w3m-tooltip-parent-width: ${this.triggerRect.width/2}px;
    --w3m-tooltip-display: ${this.open?`flex`:`none`};
    --w3m-tooltip-opacity: ${+!!this.open};
    `,a`<wui-flex>
      <wui-icon data-placement="top" size="inherit" name="cursor"></wui-icon>
      <wui-text color="primary" variant="sm-regular">${this.message}</wui-text>
    </wui-flex>`}};h.styles=[p],m([l()],h.prototype,`open`,void 0),m([l()],h.prototype,`message`,void 0),m([l()],h.prototype,`triggerRect`,void 0),m([l()],h.prototype,`variant`,void 0),h=m([i(`w3m-tooltip`)],h);