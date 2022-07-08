/// kmp 过滤敏感词 可以处理流数据
const kmp = (text, pattern) => {
  let n = pattern.length
  let next = new Array(n)

  getNext(pattern, text)
  for (let i = 0, j = -1; text[i]; i++) {
    while (j !== -1 && text[i] !== pattern[j + 1]) j = next[j]
    if (text[i] === pattern[j + 1]) j += 1
    if (j + 1 === n) return i - j
  }
  return -1

  /// 初始化 next 数组
  function getNext() {
    next[0] = -1
    /// i 是当前正在遍历的序号 j + 1 是当前对应字符串的第几位
    for (let i = 1, j = -1; pattern[i]; i++) {
      while (j !== -1 && pattern[j + 1] !== pattern[i]) j = next[j]
      if (pattern[j + 1] === pattern[i]) j += 1
      next[i] = j
    }
  }
}
const res = kmp('abcdeeeeeabcdab', 'abcaabca')
console.log(res)


/// sunday 查找文章中的单词 最优解 n/m 不能处理流数据
const sunday = (text, pattern) => {
  let lastPosition = []

}


/// shift-and 处理流数据 更高效 O(N)
/// 预处理模式串
function shiftAnd(text, pattern) {
  let a = 1
}
// (a | b | c) & (c | d) & e & (f | a | b)
// 文本中多少段不同的子文本可以被匹配
