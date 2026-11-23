// Line-based LCS keeps repeated table rows and paragraphs aligned; bounded for long chapters.
export function sectionRevisionDiff(before = '', after = '') {
  const a=String(before).split('\n'), b=String(after).split('\n')
  if (a.length*b.length>250000) {
    const left=new Set(a),right=new Set(b)
    return [...a.filter(v=>!right.has(v)).map(text=>({kind:'removed',text})),...b.filter(v=>!left.has(v)).map(text=>({kind:'added',text}))]
  }
  const dp=Array.from({length:a.length+1},()=>new Uint32Array(b.length+1))
  for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--) dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1])
  const rows=[];let i=0,j=0
  while(i<a.length || j<b.length) {
    if(i<a.length && j<b.length && a[i]===b[j]) {rows.push({kind:'same',text:a[i++]});j++}
    else if(j<b.length && (i===a.length || dp[i][j+1]>dp[i+1][j])) rows.push({kind:'added',text:b[j++]})
    else rows.push({kind:'removed',text:a[i++]})
  }
  return rows
}
