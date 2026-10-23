import{s as e}from"./rolldown-runtime-BG2f4sTM.js";import{n as t,t as n}from"./jsx-runtime-CAqYUFj9.js";import{A as r,J as i,Y as a,a as o,b as s,d as c,i as l,p as u,r as d,s as f,x as p}from"./Typography-Bx12EuZ6.js";var m=e(t());function h(e){return p(`MuiCircularProgress`,e)}u(`MuiCircularProgress`,[`root`,`determinate`,`indeterminate`,`colorPrimary`,`colorSecondary`,`svg`,`circle`,`circleDeterminate`,`circleIndeterminate`,`circleDisableShrink`]);var g=n(),_=44,v=a`
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
`,y=a`
  0% {
    stroke-dasharray: 1px, 200px;
    stroke-dashoffset: 0;
  }

  50% {
    stroke-dasharray: 100px, 200px;
    stroke-dashoffset: -15px;
  }

  100% {
    stroke-dasharray: 1px, 200px;
    stroke-dashoffset: -126px;
  }
`,b=typeof v==`string`?null:i`
        animation: ${v} 1.4s linear infinite;
      `,x=typeof y==`string`?null:i`
        animation: ${y} 1.4s ease-in-out infinite;
      `,S=e=>{let{classes:t,variant:n,color:r,disableShrink:i}=e;return s({root:[`root`,n,`color${c(r)}`],svg:[`svg`],circle:[`circle`,`circle${c(n)}`,i&&`circleDisableShrink`]},h,t)},C=f(`span`,{name:`MuiCircularProgress`,slot:`Root`,overridesResolver:(e,t)=>{let{ownerState:n}=e;return[t.root,t[n.variant],t[`color${c(n.color)}`]]}})(o(({theme:e})=>({display:`inline-block`,variants:[{props:{variant:`determinate`},style:{transition:e.transitions.create(`transform`)}},{props:{variant:`indeterminate`},style:b||{animation:`${v} 1.4s linear infinite`}},...Object.entries(e.palette).filter(d()).map(([t])=>({props:{color:t},style:{color:(e.vars||e).palette[t].main}}))]}))),w=f(`svg`,{name:`MuiCircularProgress`,slot:`Svg`})({display:`block`}),T=f(`circle`,{name:`MuiCircularProgress`,slot:`Circle`,overridesResolver:(e,t)=>{let{ownerState:n}=e;return[t.circle,t[`circle${c(n.variant)}`],n.disableShrink&&t.circleDisableShrink]}})(o(({theme:e})=>({stroke:`currentColor`,variants:[{props:{variant:`determinate`},style:{transition:e.transitions.create(`stroke-dashoffset`)}},{props:{variant:`indeterminate`},style:{strokeDasharray:`80px, 200px`,strokeDashoffset:0}},{props:({ownerState:e})=>e.variant===`indeterminate`&&!e.disableShrink,style:x||{animation:`${y} 1.4s ease-in-out infinite`}}]}))),E=m.forwardRef(function(e,t){let n=l({props:e,name:`MuiCircularProgress`}),{className:i,color:a=`primary`,disableShrink:o=!1,size:s=40,style:c,thickness:u=3.6,value:d=0,variant:f=`indeterminate`,...p}=n,m={...n,color:a,disableShrink:o,size:s,thickness:u,value:d,variant:f},h=S(m),v={},y={},b={};if(f===`determinate`){let e=2*Math.PI*((_-u)/2);v.strokeDasharray=e.toFixed(3),b[`aria-valuenow`]=Math.round(d),v.strokeDashoffset=`${((100-d)/100*e).toFixed(3)}px`,y.transform=`rotate(-90deg)`}return(0,g.jsx)(C,{className:r(h.root,i),style:{width:s,height:s,...y,...c},ownerState:m,ref:t,role:`progressbar`,...b,...p,children:(0,g.jsx)(w,{className:h.svg,ownerState:m,viewBox:`${_/2} ${_/2} ${_} ${_}`,children:(0,g.jsx)(T,{className:h.circle,style:v,ownerState:m,cx:_,cy:_,r:(_-u)/2,fill:`none`,strokeWidth:u})})})});export{E as t};