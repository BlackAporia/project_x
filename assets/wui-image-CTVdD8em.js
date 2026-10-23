import{f as e,l as t,o as n,t as r,v as i}from"./exports-DhpXOCRA.js";import{c as a,o}from"./wui-text-BrRr1pD5.js";var s=t`
  :host {
    display: block;
    width: var(--local-width);
    height: var(--local-height);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    border-radius: inherit;
    user-select: none;
    user-drag: none;
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
  }

  :host([data-boxed='true']) {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  :host([data-boxed='true']) img {
    width: 20px;
    height: 20px;
    border-radius: ${({borderRadius:e})=>e[16]};
  }

  :host([data-full='true']) img {
    width: 100%;
    height: 100%;
  }

  :host([data-boxed='true']) wui-icon {
    width: 20px;
    height: 20px;
  }

  :host([data-icon='error']) {
    background-color: ${({tokens:e})=>e.core.backgroundError};
  }

  :host([data-rounded='true']) {
    border-radius: ${({borderRadius:e})=>e[16]};
  }
`,c=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},l=class extends e{constructor(){super(...arguments),this.src=`./path/to/image.jpg`,this.alt=`Image`,this.size=void 0,this.boxed=!1,this.rounded=!1,this.fullSize=!1}render(){let e={inherit:`inherit`,xxs:`2`,xs:`3`,sm:`4`,md:`4`,mdl:`5`,lg:`5`,xl:`6`,xxl:`7`,"3xl":`8`,"4xl":`9`,"5xl":`10`};return this.style.cssText=`
      --local-width: ${this.size?`var(--apkt-spacing-${e[this.size]});`:`100%`};
      --local-height: ${this.size?`var(--apkt-spacing-${e[this.size]});`:`100%`};
      `,this.dataset.boxed=this.boxed?`true`:`false`,this.dataset.rounded=this.rounded?`true`:`false`,this.dataset.full=this.fullSize?`true`:`false`,this.dataset.icon=this.iconColor||`inherit`,this.icon?i`<wui-icon
        color=${this.iconColor||`inherit`}
        name=${this.icon}
        size="lg"
      ></wui-icon> `:this.logo?i`<wui-icon size="lg" color="inherit" name=${this.logo}></wui-icon> `:i`<img src=${o(this.src)} alt=${this.alt} @error=${this.handleImageError} />`}handleImageError(){this.dispatchEvent(new CustomEvent(`onLoadError`,{bubbles:!0,composed:!0}))}};l.styles=[n,s],c([a()],l.prototype,`src`,void 0),c([a()],l.prototype,`logo`,void 0),c([a()],l.prototype,`icon`,void 0),c([a()],l.prototype,`iconColor`,void 0),c([a()],l.prototype,`alt`,void 0),c([a()],l.prototype,`size`,void 0),c([a({type:Boolean})],l.prototype,`boxed`,void 0),c([a({type:Boolean})],l.prototype,`rounded`,void 0),c([a({type:Boolean})],l.prototype,`fullSize`,void 0),l=c([r(`wui-image`)],l);