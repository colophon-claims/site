import React from 'react';
export function Switch({label,checked=false,disabled=false,onChange,style,'aria-label':ariaLabel,...rest}){
  return <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel||(typeof label==='string'?label:undefined)} disabled={disabled} onClick={()=>onChange&&onChange(!checked)} style={{minHeight:44,padding:'0 var(--space-2)',border:0,background:'transparent',color:'var(--text-primary)',display:'inline-flex',alignItems:'center',gap:'var(--space-5)',font:'var(--type-ui)',fontSize:'var(--text-sm)',cursor:disabled?'not-allowed':'pointer',opacity:disabled?.5:1,...style}} {...rest}>
    <span aria-hidden="true" style={{width:34,height:19,flex:'none',borderRadius:'var(--radius-pill)',background:checked?'var(--control-checked-bg)':'var(--control-unchecked-bg)',border:'var(--border-hair) solid '+(checked?'var(--control-checked-border)':'var(--control-unchecked-border)'),position:'relative',transition:'var(--transition-ui)'}}>
      <span style={{position:'absolute',top:2,left:checked?17:2,width:13,height:13,borderRadius:'var(--radius-pill)',background:'var(--control-thumb)',transition:'left var(--duration-fast) var(--ease-standard)'}}/>
    </span>
    {label&&<span>{label}</span>}
  </button>;
}
