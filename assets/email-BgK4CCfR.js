import{E as e,F as t,G as n,P as r,S as i,b as a,r as o,t as s,u as c}from"./ModalController-293ZqF5Y.js";import{f as l,l as u,t as d,v as f,x as p}from"./exports-DhpXOCRA.js";import{r as m}from"./NetworkUtil-Pz2GiCOK.js";import{g as h}from"./exports-psidwoNx.js";import{t as g}from"./ConstantsUtil-BQdQM3be.js";import{s as _}from"./wui-text-BrRr1pD5.js";import"./wui-button-BH6OwrEJ.js";import{n as v,t as y}from"./ref-5l-qpJYb.js";import"./wui-link-GFg91bED.js";import{t as b}from"./w3m-email-otp-widget-DgW_Ph6M.js";import"./wui-icon-box-C0kVBq8u.js";import"./wui-email-input-BAMmXLZf.js";var x=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},S=class extends b{constructor(){super(...arguments),this.onOtpSubmit=async a=>{try{if(this.authConnector){let n=o.state.activeChain,l=c.getConnections(n),u=t.state.remoteFeatures?.multiWallet,d=l.length>0;if(await this.authConnector.provider.connectOtp({otp:a}),e.sendEvent({type:`track`,event:`EMAIL_VERIFICATION_CODE_PASS`}),n)await c.connectExternal(this.authConnector,n);else throw Error(`Active chain is not set on ChainController`);if(t.state.remoteFeatures?.emailCapture)return;if(t.state.siwx){await h.isAuthenticated()&&s.close();return}if(d&&u){i.replace(`ProfileWallets`),r.showSuccess(`New Wallet Added`);return}s.close()}}catch(t){throw e.sendEvent({type:`track`,event:`EMAIL_VERIFICATION_CODE_FAIL`,properties:{message:n.parseError(t)}}),t}},this.onOtpResend=async t=>{this.authConnector&&(await this.authConnector.provider.connectEmail({email:t}),e.sendEvent({type:`track`,event:`EMAIL_VERIFICATION_CODE_SENT`}))}}};S=x([d(`w3m-email-verify-otp-view`)],S);var C=u`
  wui-icon-box {
    height: ${({spacing:e})=>e[16]};
    width: ${({spacing:e})=>e[16]};
  }
`,w=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},T=class extends l{constructor(){super(),this.email=i.state.data?.email,this.authConnector=a.getAuthConnector(),this.loading=!1,this.listenForDeviceApproval()}render(){if(!this.email)throw Error(`w3m-email-verify-device-view: No email provided`);if(!this.authConnector)throw Error(`w3m-email-verify-device-view: No auth connector provided`);return f`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${[`6`,`3`,`6`,`3`]}
        gap="4"
      >
        <wui-icon-box size="xl" color="accent-primary" icon="sealCheck"></wui-icon-box>

        <wui-flex flexDirection="column" alignItems="center" gap="3">
          <wui-flex flexDirection="column" alignItems="center">
            <wui-text variant="md-regular" color="primary">
              Approve the login link we sent to
            </wui-text>
            <wui-text variant="md-regular" color="primary"><b>${this.email}</b></wui-text>
          </wui-flex>

          <wui-text variant="sm-regular" color="secondary" align="center">
            The code expires in 20 minutes
          </wui-text>

          <wui-flex alignItems="center" id="w3m-resend-section" gap="2">
            <wui-text variant="sm-regular" color="primary" align="center">
              Didn't receive it?
            </wui-text>
            <wui-link @click=${this.onResendCode.bind(this)} .disabled=${this.loading}>
              Resend email
            </wui-link>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}async listenForDeviceApproval(){if(this.authConnector)try{await this.authConnector.provider.connectDevice(),e.sendEvent({type:`track`,event:`DEVICE_REGISTERED_FOR_EMAIL`}),e.sendEvent({type:`track`,event:`EMAIL_VERIFICATION_CODE_SENT`}),i.replace(`EmailVerifyOtp`,{email:this.email})}catch{i.goBack()}}async onResendCode(){try{if(!this.loading){if(!this.authConnector||!this.email)throw Error(`w3m-email-login-widget: Unable to resend email`);this.loading=!0,await this.authConnector.provider.connectEmail({email:this.email}),this.listenForDeviceApproval(),r.showSuccess(`Code email resent`)}}catch(e){r.showError(e)}finally{this.loading=!1}}};T.styles=C,w([_()],T.prototype,`loading`,void 0),T=w([d(`w3m-email-verify-device-view`)],T);var E=p`
  wui-email-input {
    width: 100%;
  }

  form {
    width: 100%;
    display: block;
    position: relative;
  }
`,D=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},O=class extends l{constructor(){super(...arguments),this.formRef=y(),this.initialEmail=i.state.data?.email??``,this.redirectView=i.state.data?.redirectView,this.email=``,this.loading=!1}firstUpdated(){this.formRef.value?.addEventListener(`keydown`,e=>{e.key===`Enter`&&this.onSubmitEmail(e)})}render(){return f`
      <wui-flex flexDirection="column" padding="4" gap="4">
        <form ${v(this.formRef)} @submit=${this.onSubmitEmail.bind(this)}>
          <wui-email-input
            value=${this.initialEmail}
            .disabled=${this.loading}
            @inputChange=${this.onEmailInputChange.bind(this)}
          >
          </wui-email-input>
          <input type="submit" hidden />
        </form>
        ${this.buttonsTemplate()}
      </wui-flex>
    `}onEmailInputChange(e){this.email=e.detail}async onSubmitEmail(t){try{if(this.loading)return;this.loading=!0,t.preventDefault();let n=a.getAuthConnector();if(!n)throw Error(`w3m-update-email-wallet: Auth connector not found`);let r=await n.provider.updateEmail({email:this.email});e.sendEvent({type:`track`,event:`EMAIL_EDIT`}),r.action===`VERIFY_SECONDARY_OTP`?i.push(`UpdateEmailSecondaryOtp`,{email:this.initialEmail,newEmail:this.email,redirectView:this.redirectView}):i.push(`UpdateEmailPrimaryOtp`,{email:this.initialEmail,newEmail:this.email,redirectView:this.redirectView})}catch(e){r.showError(e),this.loading=!1}}buttonsTemplate(){let e=!this.loading&&this.email.length>3&&this.email!==this.initialEmail;return this.redirectView?f`
      <wui-flex gap="3">
        <wui-button size="md" variant="neutral" fullWidth @click=${i.goBack}>
          Cancel
        </wui-button>

        <wui-button
          size="md"
          variant="accent-primary"
          fullWidth
          @click=${this.onSubmitEmail.bind(this)}
          .disabled=${!e}
          .loading=${this.loading}
        >
          Save
        </wui-button>
      </wui-flex>
    `:f`
        <wui-button
          size="md"
          variant="accent-primary"
          fullWidth
          @click=${this.onSubmitEmail.bind(this)}
          .disabled=${!e}
          .loading=${this.loading}
        >
          Save
        </wui-button>
      `}};O.styles=E,D([_()],O.prototype,`email`,void 0),D([_()],O.prototype,`loading`,void 0),O=D([d(`w3m-update-email-wallet-view`)],O);var k=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},A=class extends b{constructor(){super(),this.email=i.state.data?.email,this.onOtpSubmit=async t=>{try{this.authConnector&&(await this.authConnector.provider.updateEmailPrimaryOtp({otp:t}),e.sendEvent({type:`track`,event:`EMAIL_VERIFICATION_CODE_PASS`}),i.replace(`UpdateEmailSecondaryOtp`,i.state.data))}catch(t){throw e.sendEvent({type:`track`,event:`EMAIL_VERIFICATION_CODE_FAIL`,properties:{message:n.parseError(t)}}),t}},this.onStartOver=()=>{i.replace(`UpdateEmailWallet`,i.state.data)}}};A=k([d(`w3m-update-email-primary-otp-view`)],A);var j=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},M=class extends b{constructor(){super(),this.email=i.state.data?.newEmail,this.redirectView=i.state.data?.redirectView,this.onOtpSubmit=async t=>{try{this.authConnector&&(await this.authConnector.provider.updateEmailSecondaryOtp({otp:t}),e.sendEvent({type:`track`,event:`EMAIL_VERIFICATION_CODE_PASS`}),this.redirectView&&i.reset(this.redirectView))}catch(t){throw e.sendEvent({type:`track`,event:`EMAIL_VERIFICATION_CODE_FAIL`,properties:{message:n.parseError(t)}}),t}},this.onStartOver=()=>{i.replace(`UpdateEmailWallet`,i.state.data)}}};M=j([d(`w3m-update-email-secondary-otp-view`)],M);var N=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},P=class extends l{constructor(){super(),this.authConnector=a.getAuthConnector(),this.isEmailEnabled=t.state.remoteFeatures?.email,this.isAuthEnabled=this.checkIfAuthEnabled(a.state.connectors),this.connectors=a.state.connectors,a.subscribeKey(`connectors`,e=>{this.connectors=e,this.isAuthEnabled=this.checkIfAuthEnabled(this.connectors)})}render(){if(!this.isEmailEnabled)throw Error(`w3m-email-login-view: Email is not enabled`);if(!this.isAuthEnabled)throw Error(`w3m-email-login-view: No auth connector provided`);return f`<wui-flex flexDirection="column" .padding=${[`1`,`3`,`3`,`3`]} gap="4">
      <w3m-email-login-widget></w3m-email-login-widget>
    </wui-flex> `}checkIfAuthEnabled(e){let t=e.filter(e=>e.type===g.CONNECTOR_TYPE_AUTH).map(e=>e.chain);return m.AUTH_CONNECTOR_SUPPORTED_CHAINS.some(e=>t.includes(e))}};N([_()],P.prototype,`connectors`,void 0),P=N([d(`w3m-email-login-view`)],P);export{P as W3mEmailLoginView,b as W3mEmailOtpWidget,T as W3mEmailVerifyDeviceView,S as W3mEmailVerifyOtpView,A as W3mUpdateEmailPrimaryOtpView,M as W3mUpdateEmailSecondaryOtpView,O as W3mUpdateEmailWalletView};