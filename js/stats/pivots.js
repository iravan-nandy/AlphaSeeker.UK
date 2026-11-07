/* Alpha-Seeker — pivots.js
   Moved verbatim from Alpha-Seeker.html lines 1019-1028.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

export function pivotIdx(arr, w){
  w=w||3; var H=[],L=[];
  for(var i=w;i<arr.length-w;i++){
    if(arr[i]==null) continue;
    var v=arr[i], isH=true, isL=true;
    for(var j=i-w;j<=i+w;j++){ if(arr[j]==null||j===i) continue; if(arr[j]>=v) isH=false; if(arr[j]<=v) isL=false; }
    if(isH) H.push(i); if(isL) L.push(i);
  }
  return {H:H,L:L};
}
