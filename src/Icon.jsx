const P = {
  box: 'M3 7l9-4 9 4v10l-9 4-9-4V7zm0 0l9 4 9-4M12 11v10',
  cash: 'M3 6h18v12H3zM12 15a3 3 0 100-6 3 3 0 000 6zM6 9v.01M18 15v.01',
  cart: 'M3 4h2l2.4 11h11.2L21 7H6.2M9 20a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z',
  truck: 'M2 6h12v10H2zM14 10h4l3 3v3h-7M6 19a2 2 0 100-4 2 2 0 000 4zm11 0a2 2 0 100-4 2 2 0 000 4z',
  plan: 'M4 4h16v16H4zM4 9h16M9 9v11M13 13h4M13 16h3',
  bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4l2-2zM10 20a2 2 0 004 0',
  store: 'M3 9l2-5h14l2 5M3 9h18v2a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0V9zM5 13v7h14v-7M10 20v-4h4v4',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', check: 'M5 12l5 5 9-10', chevron: 'M9 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16', close: 'M6 6l12 12M18 6L6 18', swap: 'M7 7h13l-4-4M17 17H4l4 4',
  send: 'M4 12l16-8-6 16-2-7-8-1z', spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0', home: 'M3 11l9-7 9 7v9h-6v-6H9v6H3z',
}
export default function Icon({ n, s = 22, w = 1.8, style }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={style}><path d={P[n]} /></svg>
}
