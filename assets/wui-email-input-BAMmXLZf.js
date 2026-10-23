import{f as e,o as t,t as n,v as r,x as i}from"./exports-DhpXOCRA.js";import{c as a,o}from"./wui-text-BrRr1pD5.js";import"./wui-input-text-vCE9HG3_.js";var s=i`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }
`,c=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},l=class extends e{constructor(){super(...arguments),this.disabled=!1}render(){return r`
      <wui-input-text
        type="email"
        placeholder="Email"
        icon="mail"
        size="lg"
        .disabled=${this.disabled}
        .value=${this.value}
        data-testid="wui-email-input"
        tabIdx=${o(this.tabIdx)}
      ></wui-input-text>
      ${this.templateError()}
    `}templateError(){return this.errorMessage?r`<wui-text variant="sm-regular" color="error">${this.errorMessage}</wui-text>`:null}};l.styles=[t,s],c([a()],l.prototype,`errorMessage`,void 0),c([a({type:Boolean})],l.prototype,`disabled`,void 0),c([a()],l.prototype,`value`,void 0),c([a()],l.prototype,`tabIdx`,void 0),l=c([n(`wui-email-input`)],l);