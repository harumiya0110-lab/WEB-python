import type { LearningCourse, LearningLesson, PythonFunctionTestCase } from '../types/learning'

export const learningCourses: LearningCourse[] = [
  {
    id: 'python-intro',
    title: 'Python入門',
    description: 'Pythonの考え方と、まず最初に使う基本の書き方を学びます。',
    difficulty: '初級',
    lessons: [
      {
        id: 'python-what-is-python',
        courseId: 'python-intro',
        title: 'Pythonとは何か',
        summary: 'Pythonは、読みやすくて手軽に使えるプログラミング言語です。',
        objective: ['Pythonの強みを知る', 'プログラミングの流れを理解する'],
        keyPoints: ['Pythonは簡単に書けて、学びやすい', 'ブラウザ上でもコードを実行できる', 'プログラムは順番に動く'],
        terms: [
          { term: 'プログラム', reading: 'ぷろぐらむ', meaning: 'コンピュータに指示する命令のまとまりです。' },
          { term: 'コード', reading: 'こーど', meaning: 'プログラムを書くための文です。' },
          { term: '実行', reading: 'じっこう', meaning: 'コードをコンピュータに動かしてもらうことです。' },
        ],
        sampleCode: 'print("Hello, Python!")\nprint("PyStudioへようこそ")',
        expectedOutput: 'Hello, Python!\nPyStudioへようこそ',
        commonMistakes: ['表示する文字を引用符で囲み忘れる', 'printのつづりを間違える'],
        nextStep: '次は、文字や数字を表示するprint()を練習します。',
        practice: {
          title: '画面に表示しよう',
          prompt: '「Pythonを始めよう！」と表示するコードを作成してください。',
          starter: '# print()を使って「Pythonを始めよう！」と表示しましょう\n',
          expectedOutput: 'Pythonを始めよう！',
          hints: ['画面に文字を出す命令を思い出しましょう。', 'print()のかっこの中に表示したい文字を入れます。', '文字は引用符で囲みます。例: print("こんにちは")'],
          solution: 'print("Pythonを始めよう！")',
        },
        quiz: {
          id: 'python-what-is-python-quiz',
          question: 'Pythonの特徴として正しいものを選んでください。',
          choices: ['難しくて覚えることが多い', '読みやすく、学びやすい', '日本語しか使えない'],
          answer: '読みやすく、学びやすい',
          explanation: 'Pythonは、シンプルな文法で書けるため初心者にも人気です。',
        },
      },
      {
        id: 'python-print-basics',
        courseId: 'python-intro',
        title: 'print()の使い方',
        summary: 'print()は、ユーザーにメッセージを見せる基本の命令です。',
        objective: ['print()の意味を知る', '文字や数字を表示する'],
        keyPoints: ['print()は結果を画面に出す', '文字列は""で囲む', '複数の値を並べて出せる'],
        terms: [
          { term: 'print', reading: 'ぷりんと', meaning: '画面に内容を表示する関数です。' },
          { term: '文字列', reading: 'もじれつ', meaning: '文字のまとまりで、引用符で囲みます。' },
          { term: '関数', reading: 'かんすう', meaning: '何かを実行するためのまとまった処理です。' },
        ],
        sampleCode: 'print("名前を表示します")\nprint(2025)\nprint("今年は", 2025, "年です")',
        expectedOutput: '名前を表示します\n2025\n今年は 2025 年です',
        commonMistakes: ['文字を引用符で囲まない', 'カッコを閉じ忘れる'],
        nextStep: '次は、変数に値を入れて何度も使う方法を学びます。',
        practice: {
          title: '自分の名前を表示してみよう',
          prompt: '自分の名前と「よろしくお願いします」を表示するコードを書いてください。',
          starter: '# 名前と「よろしくお願いします」を表示しましょう\n',
          expectedOutput: '田中\nよろしくお願いします',
          hints: ['表示する文章を2行に分けてみましょう。', '文字を表示するときはprint()を使います。', '例: print("田中") と print("よろしくお願いします")'],
          solution: 'print("田中")\nprint("よろしくお願いします")',
        },
        quiz: {
          id: 'python-print-basics-quiz',
          question: 'print("A") と print(10) の違いとして正しいものはどれですか。',
          choices: ['どちらも同じように見せる', 'Aは文字、10は数字として扱う', '10は表示できない'],
          answer: 'Aは文字、10は数字として扱う',
          explanation: '"A" は文字列、10 は数値です。表示のしかたが少し違います。',
        },
      },
    ],
  },
  {
    id: 'variable-types',
    title: '変数とデータ型',
    description: '値を保存して、必要なときに使えるようにします。',
    difficulty: '初級',
    lessons: [
      {
        id: 'variables-intro',
        courseId: 'variable-types',
        title: '変数とは',
        summary: '変数はデータを入れておく箱のようなものです。',
        objective: ['変数の概念を理解する', '値を入れて使う'],
        keyPoints: ['変数は名前で管理する', '代入で値を入れる', '後から値を変えられる'],
        terms: [
          { term: '変数', reading: 'へんすう', meaning: '値を保存しておく名前付きの入れ物です。' },
          { term: '代入', reading: 'だいにゅう', meaning: '変数に値を入れる操作です。' },
          { term: '値', reading: 'あたい', meaning: '変数に入っているデータのことです。' },
        ],
        sampleCode: 'name = "Taro"\nage = 16\nprint(name)\nprint(age)',
        expectedOutput: 'Taro\n16',
        commonMistakes: ['代入に==を使う', '文字列の引用符を閉じ忘れる'],
        nextStep: '次は、文字列や整数など値の種類を調べます。',
        practice: {
          title: '変数を使って自分の情報を表示しましょう',
          prompt: 'name と age を持つコードを書いて、値をprint()で出してください。',
          starter: '# name と age に値を入れて、それぞれ表示しましょう\n',
          expectedOutput: 'Aoi\n18',
          hints: ['名前と年齢を保存する箱を2つ用意します。', '変数への代入には = を使います。', '例: name = "Aoi" と age = 18 を書いてから、それぞれprint()で表示します。'],
          solution: 'name = "Aoi"\nage = 18\nprint(name)\nprint(age)',
        },
        quiz: {
          id: 'variables-intro-quiz',
          question: '変数に入れた値をあとから変えられるか。',
          choices: ['できない', 'できる', '変数は固定しかない'],
          answer: 'できる',
          explanation: '変数は後から値を上書きできます。',
        },
      },
      {
        id: 'types-and-conversion',
        courseId: 'variable-types',
        title: '型と変換',
        summary: '数値や文字列など、値には種類があります。',
        objective: ['型の違いを知る', '型変換を使う'],
        keyPoints: ['strは文字列', 'intは整数', 'floatは小数'],
        terms: [
          { term: '型', reading: 'かた', meaning: 'データの種類のことです。' },
          { term: 'int', reading: 'いんと', meaning: '整数を表す型です。' },
          { term: 'str', reading: 'すとりんぐ', meaning: '文字列の型です。' },
        ],
        sampleCode: 'age = "16"\nprint(type(age))\nprint(int(age) + 4)',
        expectedOutput: '<class \'str\'>\n20',
        commonMistakes: ['数字の文字列をそのまま足し算する', 'int()のかっこを忘れる'],
        nextStep: '次は、演算子を使って計算や比較をします。',
        practice: {
          title: '型変換をして計算しましょう',
          prompt: '文字列 "12" を整数に変換し、3を足して表示してください。',
          starter: '# "12"を整数に変換して、3を足した結果を表示しましょう\n',
          expectedOutput: '15',
          hints: ['文字のままでは算数ができないので、数に変えます。', '文字列を整数にする関数はint()です。', 'int("12") + 3 をprint()で表示します。'],
          solution: 'text = "12"\nnumber = int(text)\nprint(number + 3)',
        },
        quiz: {
          id: 'types-and-conversion-quiz',
          question: 'int("12") の結果は何ですか。',
          choices: ['"12"', '12', '12.0'],
          answer: '12',
          explanation: '文字列 "12" を整数の 12 に変換します。',
        },
      },
    ],
  },
  {
    id: 'conditionals',
    title: '条件分岐',
    description: '条件に応じて処理を変える考え方を学びます。',
    difficulty: '中級',
    lessons: [
      {
        id: 'if-else-basics',
        courseId: 'conditionals',
        title: 'if文とelse',
        summary: '条件が成り立つときと、そうでないときで処理を分けます。',
        objective: ['if文の使い方を学ぶ', '条件に応じて別の処理を選ぶ'],
        keyPoints: ['if は条件が真のときに動く', 'else はそれ以外のときに動く'],
        terms: [
          { term: 'if', reading: 'いふ', meaning: '条件が成り立つかを確認する文です。' },
          { term: 'else', reading: 'えるす', meaning: '条件が成り立たないときの処理です。' },
          { term: '条件', reading: 'じょうけん', meaning: '真か偽かを判断する基準です。' },
        ],
        sampleCode: 'age = 16\nif age >= 18:\n    print("大人")\nelse:\n    print("未成年")',
        expectedOutput: '未成年',
        commonMistakes: ['ifの最後に:を忘れる', '条件の内側をインデントしない'],
        nextStep: '次は、いろいろな比較演算子を使って条件を作ります。',
        practice: {
          title: '年齢で判定してみよう',
          prompt: 'classify_age(age)関数を作り、18以上なら「大人」、それ以外なら「未成年」を返してください。',
          starter: '# classify_age(age)関数を作り、ifとelseで結果を返しましょう\n',
          expectedOutput: '未成年',
          hints: ['年齢の値を用意し、条件によって表示を分けます。', '18以上の判定には >= を使います。', 'if age >= 18: の後に大人、else: の後に未成年を表示します。'],
          solution: 'def classify_age(age):\n    if age >= 18:\n        return "大人"\n    else:\n        return "未成年"',
          functionName: 'classify_age',
          testCases: [{ arguments: [18], expected: '大人' }, { arguments: [16], expected: '未成年' }, { arguments: [0], expected: '未成年' }, { arguments: [65], expected: '大人' }],
        },
        quiz: {
          id: 'if-else-basics-quiz',
          question: 'age >= 18 の結果が真のときは何が起きますか。',
          choices: ['else が実行される', 'if の中が実行される', '何も起きない'],
          answer: 'if の中が実行される',
          explanation: '条件が真なら if の中だけが実行されます。',
        },
      },
      {
        id: 'comparison-operators',
        courseId: 'conditionals',
        title: '比較演算子',
        summary: '値を比較して、同じか違うか、大小を判断できます。',
        objective: ['比較演算子の基本を理解する', '条件の書き方を覚える'],
        keyPoints: ['== は等しい', '> は大きい', '< は小さい'],
        terms: [
          { term: '==', reading: 'いこーる', meaning: '左右が等しいかを比較します。' },
          { term: '>=', reading: 'じょうい', meaning: '右側以上かを比較します。' },
          { term: 'and', reading: 'あんど', meaning: '両方の条件が成立するときに使います。' },
        ],
        sampleCode: 'score = 85\nprint(score >= 80)\nprint(score == 80)',
        expectedOutput: 'True\nFalse',
        commonMistakes: ['比較に=を1つだけ使う', '文字列と数値を比較する'],
        nextStep: '次は、複数の条件を組み合わせます。',
        practice: {
          title: '比較を使って結果を確認しよう',
          prompt: 'number が 10 より大きいかどうかを表示してください。',
          starter: '# numberに12を入れ、10より大きいかを表示しましょう\n',
          expectedOutput: 'True',
          hints: ['数と10を比べて、結果を表示しましょう。', '「より大きい」は > で表します。', 'print(number > 10) と書きます。'],
          solution: 'number = 12\nprint(number > 10)',
        },
        quiz: {
          id: 'comparison-operators-quiz',
          question: 'score == 100 は何を意味しますか。',
          choices: ['scoreが100未満', 'scoreが100以下', 'scoreが100と等しい'],
          answer: 'scoreが100と等しい',
          explanation: '== は「等しい」を表す比較演算子です。',
        },
      },
    ],
  },
]

interface LessonSeed {
  id: string
  title: string
  summary: string
  sample: string
  output: string
  task: string
  starter: string
  solution: string
  term: string
  mistake: string
  functionName?: string
  testCases?: PythonFunctionTestCase[]
  inputGradingRule?: LearningLesson['practice']['inputGradingRule']
}

const termReadings: Record<string, string> = {
  プログラム: 'ぷろぐらむ', コード: 'こーど', 実行: 'じっこう', print: 'ぷりんと', 文字列: 'もじれつ',
  関数: 'かんすう', 変数: 'へんすう', 代入: 'だいにゅう', 値: 'あたい', 型: 'かた',
  int: 'いんと', str: 'すとりんぐ', if: 'いふ', else: 'えるす', 条件: 'じょうけん',
  '==': 'いこーるいこーる', '>=': 'だいなりいこーる', and: 'あんど', '+': 'ぷらす',
  '-': 'まいなす', '*': 'あすたりすく', '%': 'ぱーせんと', 比較演算子: 'ひかくえんざんし',
  'input()': 'いんぷっと', 'int()': 'いんと', 'float()': 'ふろーと', for: 'ふぉー',
  'range()': 'れんじ', while: 'わいる', break: 'ぶれいく', 二重ループ: 'にじゅうるーぷ',
  list: 'りすと', インデックス: 'いんでっくす', 'append()': 'あぺんど', tuple: 'たぷる',
  set: 'せっと', dict: 'でぃくと', キー: 'きー', 'upper()': 'あっぱー', 'split()': 'すぷりっと',
  f文字列: 'えふもじれつ', def: 'でふ', 引数: 'ひきすう', return: 'りたーん',
  スコープ: 'すこーぷ', 'open()': 'おーぷん', with: 'うぃず', except: 'いくせぷと',
  import: 'いんぽーと', class: 'くらす', '__init__()': 'いにっと', メソッド: 'めそっど',
  四則演算: 'しそくえんざん', 判定: 'はんてい', 'sum()': 'さむ', ToDoリスト: 'とぅーどぅーりすと',
  リスト内包表記: 'りすとないほうひょうき', lambda: 'らむだ', 型ヒント: 'かたひんと',
  assert: 'あさーと', CSV: 'しーえすぶい', DataFrame: 'でーたふれーむ', Matplotlib: 'まっとぷろっとりぶ',
}

const syntaxByTerm: Record<string, string> = {
  print: 'print(表示したい値)', 文字列: '"文字をここに書く"', 変数: '名前 = 値', 代入: '変数名 = 値',
  int: 'int(数値の文字列)', str: 'str(値)', if: 'if 条件:\n    処理\nelse:\n    別の処理',
  else: 'if 条件:\n    処理\nelse:\n    別の処理', 条件: 'if 条件:\n    条件が真のときの処理',
  '==': '値1 == 値2', '>=': '値1 >= 値2', and: '条件1 and 条件2', '+': '値1 + 値2',
  '-': '値1 - 値2', '*': '値1 * 値2', '%': '値1 % 値2', 'input()': '答え = input("質問: ")',
  'int()': '数値 = int(入力文字列)', 'float()': '小数 = float(入力文字列)',
  for: 'for 要素 in データ:\n    繰り返す処理', 'range()': 'for 数値 in range(開始, 終了):\n    繰り返す処理',
  while: 'while 条件:\n    処理\n    条件を変える', break: 'if 終了条件:\n    break',
  list: '値の一覧 = [値1, 値2]', 'append()': 'リスト.append(追加する値)', tuple: '座標 = (x, y)',
  set: '重複を除く集合 = {値1, 値2}', dict: '辞書 = {"キー": 値}', 'split()': '文字列.split("区切り")',
  'upper()': '文字列.upper()', f文字列: 'f"こんにちは、{name}さん"',
  def: 'def 関数名(引数):\n    return 結果', 引数: 'def 関数名(引数):\n    処理',
  return: 'def 関数名():\n    return 戻り値', 'open()': 'with open("ファイル名") as file:\n    内容 = file.read()',
  with: 'with open("ファイル名") as file:\n    処理', except: 'try:\n    処理\nexcept エラー名:\n    対応',
  import: 'import モジュール名', class: 'class クラス名:\n    pass', '__init__()': 'def __init__(self, 値):\n    self.属性 = 値',
  'sum()': '合計 = sum(数値のリスト)', lambda: '関数 = lambda 引数: 式',
}

function explainSampleLine(line: string): string {
  const trimmed = line.trim()
  const indentation = line.length - line.trimStart().length
  if (!trimmed) return '空行で、処理のまとまりを読みやすく区切っています。'
  if (trimmed.startsWith('#')) return 'コメントです。Pythonはこの行を実行せず、説明として扱います。'
  if (/^print\(/.test(trimmed)) {
    const argument = trimmed.slice(trimmed.indexOf('(') + 1, trimmed.lastIndexOf(')'))
    return `print()に渡した「${argument}」を画面に表示します。`
  }
  if (/^if\b/.test(trimmed)) return `「${trimmed.slice(3, -1).trim()}」が真かどうかを調べ、真のときだけインデントされた処理を実行します。`
  if (/^elif\b/.test(trimmed)) return `前の条件が成り立たなかった場合に「${trimmed.slice(5, -1).trim()}」を調べます。`
  if (trimmed === 'else:') return '上の条件がどれも成り立たなかったときに実行する分岐です。'
  if (/^for\b/.test(trimmed)) {
    const [, name, values] = trimmed.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+):$/) ?? []
    return name && values
      ? `${values}から値を1つずつ取り出して${name}に入れ、インデントされた処理を繰り返します。`
      : 'データから値を順に取り出し、インデントされた処理を繰り返します。'
  }
  if (/^while\b/.test(trimmed)) return `「${trimmed.slice(6, -1).trim()}」が真である間、インデントされた処理を繰り返します。`
  if (/^def\b/.test(trimmed)) {
    const name = trimmed.match(/^def\s+([A-Za-z_]\w*)/)?.[1]
    return `「${name ?? '関数'}」を定義します。後で名前を呼び出すと、インデントした処理が動きます。`
  }
  if (/^class\b/.test(trimmed)) return `「${trimmed.slice(6, -1).trim()}」というクラスを定義し、データと処理をまとめる準備をします。`
  if (/^return\b/.test(trimmed)) return `「${trimmed.slice(7).trim()}」を関数の呼び出し元へ返します。`
  if (/^import\b|^from\b/.test(trimmed)) return '別のモジュールから必要な機能を読み込みます。'
  if (/^break\b/.test(trimmed)) return 'breakで、現在の繰り返しをその場で終了します。'
  if (/^continue\b/.test(trimmed)) return 'continueで、繰り返しの残りを飛ばして次の回へ進みます。'
  const assignment = trimmed.match(/^([A-Za-z_]\w*)\s*(\+=|-=|\*=|=)\s*(.*)$/)
  if (assignment) {
    const [, name, operator, value] = assignment
    const action = operator === '=' ? '値を保存' : `現在の値を「${value}」で更新`
    if (/^input\(/.test(value!)) return `input()が受け取った文字列を「${name}」に保存します。`
    if (/^(int|float|str)\(/.test(value!)) return `${value}で型を変換した結果を「${name}」に保存します。`
    if (value!.startsWith('[')) return `リスト「${value}」を作り、「${name}」に保存します。`
    if (value!.startsWith('{')) return `キーと値を持つ辞書「${value}」を作り、「${name}」に保存します。`
    return `「${name}」に${action}します。右辺の「${value}」が${operator === '=' ? '保存する値' : '更新に使う値'}です。`
  }
  if (/^try:/.test(trimmed)) return '例外が起きる可能性のある処理を、tryブロックにまとめます。'
  if (/^except\b/.test(trimmed)) return 'tryの中で指定した種類のエラーが起きたとき、ここで対応します。'
  if (indentation > 0) return `インデントされた処理「${trimmed}」を、上の条件・関数・繰り返しの中で実行します。`
  return `この行の式「${trimmed}」を評価し、その結果を次の処理に使います。`
}

function createCourse(
  id: string,
  title: string,
  description: string,
  difficulty: LearningCourse['difficulty'],
  seeds: LessonSeed[],
): LearningCourse {
  return {
    id,
    title,
    description,
    difficulty,
    lessons: seeds.map((seed, index) => {
      const lessonId = `${id}-${seed.id}`
      const conceptChoices = [seed.term, 'print()', 'if文', 'for文', 'list', 'def']
        .filter((choice, choiceIndex, choices) => choice !== seed.term && choices.indexOf(choice) === choiceIndex)
        .slice(index % 2, index % 2 + 2)
      const quizType = index % 3
      const quizChoices = quizType === 1
        ? [seed.term, ...conceptChoices]
        : [seed.output, `${seed.output}0`, `エラー: ${seed.term}`]
      const quizAnswer = quizType === 1 ? seed.term : seed.output
      const nextSeed = seeds[index + 1]
      const sampleLineExplanations = seed.sample.split('\n').map(explainSampleLine)
      return {
        id: lessonId,
        courseId: id,
        title: seed.title,
        summary: seed.summary,
        explanation: `${seed.summary} 今回は「${seed.task}」という身近な課題で、この考え方を実際のコードに結び付けます。`,
        syntax: syntaxByTerm[seed.term] ?? seed.solution.split('\n')[0]!,
        sampleLineExplanations,
        objective: [seed.summary, `練習では「${seed.task}」を自分のコードで解決します。`],
        keyPoints: [seed.summary, `間違えやすい点: ${seed.mistake}。実行結果とコードの対応を確認しましょう。`],
        terms: [{
          term: seed.term,
          reading: termReadings[seed.term] ?? seed.term,
          meaning: seed.summary,
          usage: seed.task,
          exampleCode: seed.sample,
          exampleOutput: seed.output,
        }],
        sampleCode: seed.sample,
        expectedOutput: seed.output,
        commonMistakes: [seed.mistake],
        nextStep: nextSeed
          ? `次は「${nextSeed.title}」を学びます。今回の${seed.term}を使った考え方を、${nextSeed.summary}`
          : `「${seed.title}」を使えるようになりました。${description}を使う実践課題にも挑戦してみましょう。`,
        practice: {
          title: `${seed.title}を使ってみよう`,
          prompt: seed.task,
          starter: seed.starter,
          expectedOutput: seed.output,
          hints: [
            `課題「${seed.task}」の中で、サンプルのどの値や処理を変えるか考えてみましょう。`,
            `${seed.term}を使う位置を確認し、期待する結果「${seed.output}」へつなげましょう。`,
            `まずはこの部分から書いてみましょう: ${seed.solution.split('\n')[0]}`,
          ],
          solution: seed.solution,
          functionName: seed.functionName,
          testCases: seed.testCases,
          inputGradingRule: seed.inputGradingRule,
        },
        quiz: {
          id: `${lessonId}-quiz`,
          question: quizType === 1
            ? `課題「${seed.task}」を解くとき、中心になる文法・用語はどれですか。`
            : `${seed.title}のサンプルを上から実行したとき、正しい結果はどれですか。`,
          choices: quizChoices,
          answer: quizAnswer,
          explanation: quizType === 1
            ? `${seed.term}はこの課題の「${seed.task}」で使う中心的な用語です。${seed.summary}`
            : `サンプルの${sampleLineExplanations.length}行を上から実行します。${sampleLineExplanations.join(' ')} 出力は「${seed.output}」です。`,
          choiceExplanations: Object.fromEntries(quizChoices.map((choice) => [
            choice,
            choice === quizAnswer
              ? (quizType === 1 ? seed.summary : `サンプルコードの結果は「${seed.output}」です。`)
              : (quizType === 1 ? `${choice}は別の用途の文法です。課題で求められている操作に注目しましょう。` : `出力の順番や値をコードと照らし合わせて再確認しましょう。`),
          ])),
        },
      }
    }),
  }
}

for (const [courseIndex, course] of learningCourses.entries()) {
  for (const [lessonIndex, lesson] of course.lessons.entries()) {
    const previousInCourse = course.lessons[lessonIndex - 1]
    const previousCourse = learningCourses[courseIndex - 1]
    lesson.prerequisites ??= previousInCourse
      ? [previousInCourse.id]
      : previousCourse
        ? [previousCourse.lessons[previousCourse.lessons.length - 1]!.id]
        : []
  }
}

learningCourses.push(
  createCourse('operators', '演算子と計算', '計算、比較、条件の組み立て方を身につけます。', '初級', [
    { id: 'addition', title: '足し算', summary: 'プラス記号で数を足せます。', sample: 'print(4 + 3)', output: '7', task: '4と3を足して結果を表示してください。', starter: '# 足し算の結果を表示しましょう\n', solution: 'print(4 + 3)', term: '+', mistake: '文字列の足し算と数値の足し算を混同する' },
    { id: 'subtraction', title: '引き算', summary: 'マイナス記号で数を引けます。', sample: 'print(10 - 4)', output: '6', task: '10から4を引いて表示してください。', starter: '# 引き算の結果を表示しましょう\n', solution: 'print(10 - 4)', term: '-', mistake: '引く順番を逆にする' },
    { id: 'multiplication', title: '掛け算', summary: 'アスタリスク * で掛け算をします。', sample: 'print(6 * 7)', output: '42', task: 'multiply(a, b)関数を作り、2つの数の積をreturnしてください。', starter: '# multiply(a, b)を作成して積を返しましょう\n', solution: 'def multiply(a, b):\n    return a * b', term: '*', mistake: '掛け算に x ではなく * を使う', functionName: 'multiply', testCases: [{ arguments: [2, 3], expected: 6 }, { arguments: [-4, 5], expected: -20 }, { arguments: [0, 7], expected: 0 }, { arguments: [1.5, 2], expected: 3.0 }] },
    { id: 'division-remainder', title: '割り算と余り', summary: '/ は割り算、% は割った余りを求めます。', sample: 'print(9 / 2)\nprint(9 % 2)', output: '4.5\n1', task: '9を2で割った商と余りを順番に表示してください。', starter: '# / と % を使って結果を2行で表示しましょう\n', solution: 'print(9 / 2)\nprint(9 % 2)', term: '%', mistake: '商と余りを同じ演算子で計算する' },
    { id: 'comparison', title: '比較演算子', summary: '比較演算子は条件が正しいかをTrueまたはFalseで返します。', sample: 'print(8 >= 5)\nprint(3 == 5)', output: 'True\nFalse', task: '8が5以上か、3が5と等しいかを表示してください。', starter: '# 2つの比較結果を表示しましょう\n', solution: 'print(8 >= 5)\nprint(3 == 5)', term: '比較演算子', mistake: '等しいかの比較に = を1つだけ使う' },
  ]),
  createCourse('user-input', 'input()と型変換', 'ユーザーから値を受け取り、計算で使う方法を学びます。', '初級', [
    { id: 'input-string', title: 'input()で入力する', summary: 'input()はユーザーが入力した文字を受け取ります。', sample: 'name = input("名前: ")\nprint("こんにちは", name)', output: 'こんにちは PyStudio', task: 'input()で受け取った名前を「こんにちは」と一緒に表示してください。好きな名前を入力して試せます。', starter: 'name = input("名前: ")\n# nameを使って挨拶を表示しましょう\n', solution: 'name = input("名前: ")\nprint("こんにちは", name)', term: 'input()', mistake: '入力された値は文字列であることを忘れる', inputGradingRule: { type: 'template', template: 'こんにちは {0}', testCases: [{ inputs: ['Aoi'], expectedOutput: 'こんにちは Aoi' }, { inputs: ['Ren'], expectedOutput: 'こんにちは Ren' }] } },
    { id: 'input-to-int', title: '入力を整数に変換する', summary: 'int()を使うと、数字の文字列を整数に変えられます。', sample: 'value = int("12")\nprint(value + 3)', output: '15', task: 'input()で受け取った整数に3を足して表示してください。入力例は12と8です。', starter: 'text = input("整数: ")\nnumber = int(text)\n# numberに3を足した値を表示しましょう\n', solution: 'text = input("整数: ")\nnumber = int(text)\nprint(number + 3)', term: 'int()', mistake: '文字列のまま数値計算しようとする', inputGradingRule: { type: 'integer-add', operand: 3, testCases: [{ inputs: ['12'], expectedOutput: '15' }, { inputs: ['8'], expectedOutput: '11' }, { inputs: ['-2'], expectedOutput: '1' }] } },
    { id: 'input-float', title: '小数に変換する', summary: 'float()は小数を含む数値に変換します。', sample: 'price = float("1.5")\nprint(price * 2)', output: '3.0', task: '"1.5"を小数に変換し、2倍して表示してください。', starter: '# float()を使って小数を計算しましょう\n', solution: 'price = float("1.5")\nprint(price * 2)', term: 'float()', mistake: '小数の文字列をint()に渡す' },
  ]),
  createCourse('loops', '繰り返し処理', 'forやwhileを使って同じ処理をまとめて実行します。', '初級', [
    { id: 'for-loop', title: 'for文', summary: 'for文は、決めた回数やデータの数だけ処理を繰り返します。', sample: 'for item in ["赤", "青"]:\n    print(item)', output: '赤\n青', task: '赤と青をリストにして、for文で1行ずつ表示してください。', starter: '# for文で2つの色を順に表示しましょう\n', solution: 'for item in ["赤", "青"]:\n    print(item)', term: 'for', mistake: '繰り返す処理のインデントを忘れる' },
    { id: 'range', title: 'range()', summary: 'range()は連続した整数を作り、回数を指定した繰り返しに使えます。', sample: 'for number in range(1, 4):\n    print(number)', output: '1\n2\n3', task: 'range()を使って1から3を表示してください。', starter: '# range()で1、2、3を繰り返し表示しましょう\n', solution: 'for number in range(1, 4):\n    print(number)', term: 'range()', mistake: 'range(1, 4)の終わりの4も含まれると思う' },
    { id: 'while-loop', title: 'while文', summary: 'while文は条件が成り立つ間、処理を繰り返します。', sample: 'count = 1\nwhile count <= 3:\n    print(count)\n    count += 1', output: '1\n2\n3', task: 'while文で1から3を順に表示してください。', starter: '# countを更新しながらwhile文を使いましょう\n', solution: 'count = 1\nwhile count <= 3:\n    print(count)\n    count += 1', term: 'while', mistake: '条件を変える処理を書かず無限ループにする' },
    { id: 'break-continue', title: 'breakとcontinue', summary: 'breakは繰り返しを終了し、continueは次の回へ進みます。', sample: 'for number in range(5):\n    if number == 3:\n        break\n    print(number)', output: '0\n1\n2', task: '0から順に表示し、3になったらbreakで終了してください。', starter: '# for文とif文、breakを組み合わせましょう\n', solution: 'for number in range(5):\n    if number == 3:\n        break\n    print(number)', term: 'break', mistake: 'breakをif文の外に置いてしまう' },
    { id: 'nested-loop', title: '二重ループ', summary: 'ループの中に別のループを書くと、組み合わせを作れます。', sample: 'for row in range(2):\n    for col in range(2):\n        print(row, col)', output: '0 0\n0 1\n1 0\n1 1', task: '二重ループで0と1の組を4行表示してください。', starter: '# for文を2つ組み合わせましょう\n', solution: 'for row in range(2):\n    for col in range(2):\n        print(row, col)', term: '二重ループ', mistake: '内側のループのインデント位置を間違える' },
  ]),
  createCourse('sequences', 'リスト・タプル・集合', '複数の値をひとまとめに扱う方法を学びます。', '初級', [
    { id: 'list-create', title: 'リストを作る', summary: 'リストは複数の値を順番に保存する入れ物です。', sample: 'colors = ["赤", "青"]\nprint(colors)', output: "['赤', '青']", task: '赤と青のリストを作って表示してください。', starter: '# リストを作成して表示しましょう\n', solution: 'colors = ["赤", "青"]\nprint(colors)', term: 'list', mistake: 'リストの要素をカンマで区切らない' },
    { id: 'list-index', title: 'インデックスで取り出す', summary: 'リストの番号は0から始まります。', sample: 'scores = [80, 90, 75]\nprint(scores[0])', output: '80', task: 'リストの最初の点数を表示してください。', starter: '# scoresの最初の値を取り出しましょう\n', solution: 'scores = [80, 90, 75]\nprint(scores[0])', term: 'インデックス', mistake: '最初の要素の番号を1だと思う' },
    { id: 'append', title: 'append()で追加する', summary: 'append()はリストの最後に値を追加します。', sample: 'items = ["本"]\nitems.append("ペン")\nprint(items)', output: "['本', 'ペン']", task: 'itemsに「ペン」をappend()で追加して表示してください。', starter: '# append()でリストに値を追加しましょう\n', solution: 'items = ["本"]\nitems.append("ペン")\nprint(items)', term: 'append()', mistake: 'append()の結果を新しいリストとして代入する' },
    { id: 'tuple', title: 'タプル', summary: 'タプルは作成後に要素を変更しないデータのまとまりです。', sample: 'point = (3, 5)\nprint(point[1])', output: '5', task: '座標(3, 5)をタプルにして、2つ目の値を表示してください。', starter: '# タプルを作って2つ目の要素を取り出しましょう\n', solution: 'point = (3, 5)\nprint(point[1])', term: 'tuple', mistake: 'タプルを変更できるリストと同じように扱う' },
    { id: 'set', title: '集合set', summary: 'setは重複する値をまとめて1つにできます。', sample: 'numbers = {1, 1, 2}\nprint(len(numbers))', output: '2', task: '1, 1, 2の集合を作り、要素数を表示してください。', starter: '# setを作ってlen()で要素数を表示しましょう\n', solution: 'numbers = {1, 1, 2}\nprint(len(numbers))', term: 'set', mistake: '集合の表示順に意味があると思い込む' },
  ]),
  createCourse('dictionary-strings', '辞書と文字列操作', 'キーと値の辞書、文字列の便利な処理を学びます。', '中級', [
    { id: 'dict-create', title: '辞書を作る', summary: '辞書はキーと値を組み合わせて保存します。', sample: 'person = {"name": "Aoi"}\nprint(person["name"])', output: 'Aoi', task: 'get_name(person)を作り、辞書のnameを返してください。nameがない場合は「不明」を返します。', starter: '# get_name(person)関数を作りましょう\n', solution: 'def get_name(person):\n    return person.get("name", "不明")', term: 'dict', mistake: '値を取り出すときにキーを引用符で囲み忘れる', functionName: 'get_name', testCases: [{ arguments: [{ name: 'Aoi' }], expected: 'Aoi' }, { arguments: [{ name: 'Ren' }], expected: 'Ren' }, { arguments: [{ age: 20 }], expected: '不明' }] },
    { id: 'dict-update', title: '辞書を更新する', summary: '辞書はキーを指定して値を追加・変更できます。', sample: 'stock = {"apple": 3}\nstock["apple"] = 4\nprint(stock["apple"])', output: '4', task: '在庫を3から4に更新して表示してください。', starter: '# 辞書の値を更新しましょう\n', solution: 'stock = {"apple": 3}\nstock["apple"] = 4\nprint(stock["apple"])', term: 'キー', mistake: '存在しないキーと既存キーを区別しない' },
    { id: 'string-methods', title: '文字列のメソッド', summary: '文字列には大文字小文字変換などの便利な機能があります。', sample: 'word = "python"\nprint(word.upper())', output: 'PYTHON', task: 'to_upper(text)関数を作り、文字列を大文字にして返してください。', starter: '# to_upper(text)を定義しましょう\n', solution: 'def to_upper(text):\n    return text.upper()', term: 'upper()', mistake: 'メソッドの後ろの()を書き忘れる', functionName: 'to_upper', testCases: [{ arguments: ['python'], expected: 'PYTHON' }, { arguments: ['Hello'], expected: 'HELLO' }, { arguments: ['PyStudio 3'], expected: 'PYSTUDIO 3' }] },
    { id: 'split-join', title: 'split()とjoin()', summary: 'split()は文字列を分け、join()は文字列をつなぎます。', sample: 'words = "a,b,c".split(",")\nprint("-".join(words))', output: 'a-b-c', task: 'カンマ区切りの"a,b,c"をハイフンでつないで表示してください。', starter: '# split()とjoin()を組み合わせましょう\n', solution: 'words = "a,b,c".split(",")\nprint("-".join(words))', term: 'split()', mistake: 'join()をリストではなく単一の文字列に使う' },
    { id: 'f-strings', title: 'f文字列', summary: 'f文字列を使うと文章に変数の値を埋め込めます。', sample: 'name = "Aoi"\nprint(f"こんにちは、{name}さん")', output: 'こんにちは、Aoiさん', task: 'nameの値Aoiをf文字列に入れて挨拶を表示してください。', starter: '# f文字列でnameを表示しましょう\n', solution: 'name = "Aoi"\nprint(f"こんにちは、{name}さん")', term: 'f文字列', mistake: '文字列の先頭にfを付け忘れる' },
  ]),
  createCourse('functions', '関数', '処理を名前の付いたまとまりにして、再利用する方法を学びます。', '中級', [
    { id: 'def', title: '関数を定義する', summary: 'defで関数を作り、名前を付けた処理を呼び出せます。', sample: 'def greet():\n    print("こんにちは")\ngreet()', output: 'こんにちは', task: 'greetという関数を作り、「こんにちは」と表示してください。', starter: '# defでgreet関数を作って呼び出しましょう\n', solution: 'def greet():\n    print("こんにちは")\ngreet()', term: 'def', mistake: '関数を定義しただけで呼び出さない' },
    { id: 'arguments', title: '引数を使う', summary: '引数を使うと関数に値を渡せます。', sample: 'def greet(name):\n    print("こんにちは", name)\ngreet("Aoi")', output: 'こんにちは Aoi', task: 'greet(name)関数を作り、受け取った名前を入れた挨拶文をreturnしてください。', starter: '# 引数nameを受け取るgreet関数を作りましょう\n', solution: 'def greet(name):\n    return f"こんにちは {name}"', term: '引数', mistake: '関数定義と呼び出しで引数の数を合わせない', functionName: 'greet', testCases: [{ arguments: ['Aoi'], expected: 'こんにちは Aoi' }, { arguments: ['Ren'], expected: 'こんにちは Ren' }, { arguments: ['Python'], expected: 'こんにちは Python' }] },
    { id: 'return', title: '戻り値を返す', summary: 'returnは関数の計算結果を呼び出し元に返します。', sample: 'def add(a, b):\n    return a + b\nprint(add(2, 3))', output: '5', task: 'add関数を定義し、2つの引数の合計をreturnしてください。複数の数値で自動採点します。', starter: '# add(a, b)を作成して合計を返しましょう\n', solution: 'def add(a, b):\n    return a + b', term: 'return', mistake: 'returnとprintの役割を混同する', functionName: 'add', testCases: [{ arguments: [1, 2], expected: 3 }, { arguments: [10, 20], expected: 30 }, { arguments: [-5, 5], expected: 0 }, { arguments: [0, 0], expected: 0 }] },
    { id: 'scope', title: '変数のスコープ', summary: '関数内で作った変数は、基本的に関数の外から直接使えません。', sample: 'def make_message():\n    message = "準備OK"\n    return message\nprint(make_message())', output: '準備OK', task: 'make_message(name)関数の中でメッセージを作り、returnしてください。', starter: '# nameを受け取り、関数の中でmessageを作りましょう\n', solution: 'def make_message(name):\n    message = f"{name}さん、準備OK"\n    return message', term: 'スコープ', mistake: '関数内の変数を外で直接参照する', functionName: 'make_message', testCases: [{ arguments: ['Aoi'], expected: 'Aoiさん、準備OK' }, { arguments: ['Ren'], expected: 'Renさん、準備OK' }] },
  ]),
  createCourse('files-errors-modules', 'ファイル操作・例外・モジュール', 'ファイルや標準ライブラリを利用し、エラーに備える方法を学びます。', '中級', [
    { id: 'file-write-read', title: 'ファイルの読み書き', summary: 'open()でファイルを開き、write()とread()で内容を扱います。', sample: 'with open("note.txt", "w", encoding="utf-8") as file:\n    file.write("学習")\nwith open("note.txt", encoding="utf-8") as file:\n    print(file.read())', output: '学習', task: 'note.txtに「学習」と書き込み、読み込んで表示してください。', starter: '# with open()でファイルを書いて読み戻しましょう\n', solution: 'with open("note.txt", "w", encoding="utf-8") as file:\n    file.write("学習")\nwith open("note.txt", encoding="utf-8") as file:\n    print(file.read())', term: 'open()', mistake: 'ファイルの文字コード指定を忘れる' },
    { id: 'with', title: 'with文', summary: 'with文はファイルを使い終わった後に自動で閉じます。', sample: 'with open("count.txt", "w", encoding="utf-8") as file:\n    file.write("3")\nprint("保存しました")', output: '保存しました', task: 'with文でcount.txtに3を書き込み、保存したと表示してください。', starter: '# with文でファイルを安全に開きましょう\n', solution: 'with open("count.txt", "w", encoding="utf-8") as file:\n    file.write("3")\nprint("保存しました")', term: 'with', mistake: 'withブロック内のインデントを揃えない' },
    { id: 'try-except', title: 'tryとexcept', summary: 'tryとexceptを使うと、予想されるエラーに備えられます。', sample: 'try:\n    number = int("abc")\nexcept ValueError:\n    print("数字を確認してください")', output: '数字を確認してください', task: '文字abcの変換をtry/exceptで囲み、失敗時に案内を表示してください。', starter: '# ValueErrorをexceptで処理しましょう\n', solution: 'try:\n    number = int("abc")\nexcept ValueError:\n    print("数字を確認してください")', term: 'except', mistake: 'すべてのエラーを無条件に無視する' },
    { id: 'import-module', title: 'importと標準ライブラリ', summary: 'importを使うと、Pythonに用意された機能を利用できます。', sample: 'import math\nprint(math.sqrt(25))', output: '5.0', task: 'mathを読み込み、25の平方根を表示してください。', starter: '# mathをimportして平方根を計算しましょう\n', solution: 'import math\nprint(math.sqrt(25))', term: 'import', mistake: '読み込んだモジュール名を使わずに関数だけを呼ぶ' },
  ]),
  createCourse('object-oriented', 'オブジェクト指向', 'データと処理をクラスにまとめる基本を学びます。', '中級', [
    { id: 'class-instance', title: 'クラスとインスタンス', summary: 'クラスは設計図、インスタンスは設計図から作った実体です。', sample: 'class Pet:\n    pass\npet = Pet()\nprint(type(pet).__name__)', output: 'Pet', task: 'Petクラスを定義してインスタンスを作り、型名を表示してください。', starter: '# Petというクラスを定義しましょう\n', solution: 'class Pet:\n    pass\npet = Pet()\nprint(type(pet).__name__)', term: 'class', mistake: 'クラス名とインスタンス変数を同じものと考える' },
    { id: 'init-self', title: '__init__()とself', summary: '__init__()はインスタンス作成時の初期設定を行い、selfはその実体を指します。', sample: 'class Pet:\n    def __init__(self, name):\n        self.name = name\npet = Pet("Momo")\nprint(pet.name)', output: 'Momo', task: '名前を受け取るPetクラスを作り、Momoを表示してください。', starter: '# __init__()でnameを保存しましょう\n', solution: 'class Pet:\n    def __init__(self, name):\n        self.name = name\npet = Pet("Momo")\nprint(pet.name)', term: '__init__()', mistake: 'メソッドの第1引数selfを省く' },
    { id: 'method', title: 'メソッド', summary: 'メソッドはクラスに定義する関数で、インスタンスの情報を使えます。', sample: 'class Counter:\n    def show(self):\n        print("数えます")\nCounter().show()', output: '数えます', task: 'show()メソッドを持つCounterクラスを作って実行してください。', starter: '# クラス内にshowメソッドを作りましょう\n', solution: 'class Counter:\n    def show(self):\n        print("数えます")\nCounter().show()', term: 'メソッド', mistake: 'インスタンスからメソッドを呼び出し忘れる' },
  ]),
  createCourse('practical-programming', '実践プログラミング', 'これまでの文法を組み合わせて小さなプログラムを作ります。', '応用', [
    { id: 'calculator', title: '簡単な計算機', summary: '入力、型変換、計算を組み合わせて計算機を作れます。', sample: 'a = 8\nb = 2\nprint(a + b)\nprint(a / b)', output: '10\n4.0', task: '8と2の足し算と割り算の結果を表示してください。', starter: '# 変数と四則演算で計算機を作りましょう\n', solution: 'a = 8\nb = 2\nprint(a + b)\nprint(a / b)', term: '四則演算', mistake: '割る数が0にならないか考えない' },
    { id: 'quiz-app', title: 'クイズアプリ', summary: '問題と答えをデータにして、回答を判定する流れを作ります。', sample: 'answer = "Python"\nif answer == "Python":\n    print("正解")\nelse:\n    print("もう一度")', output: '正解', task: 'answerがPythonと等しいとき「正解」と表示してください。', starter: '# ifとelseで答えを判定しましょう\n', solution: 'answer = "Python"\nif answer == "Python":\n    print("正解")\nelse:\n    print("もう一度")', term: '判定', mistake: '文字列の比較に == を使わない' },
    { id: 'grade-management', title: '成績管理', summary: 'リストの数値を集計し、全体の平均を計算できます。', sample: 'scores = [80, 90, 70]\nprint(sum(scores) / len(scores))', output: '80.0', task: 'average(scores)関数を作り、点数リストの平均を返してください。', starter: '# sum()とlen()を使うaverage(scores)関数を作りましょう\n', solution: 'def average(scores):\n    return sum(scores) / len(scores)', term: 'sum()', mistake: '平均を求めるときに件数で割り忘れる', functionName: 'average', testCases: [{ arguments: [[80, 90, 70]], expected: 80.0 }, { arguments: [[100, 50]], expected: 75.0 }, { arguments: [[1, 2, 3, 4]], expected: 2.5 }] },
    { id: 'todo-list', title: 'ToDoリストの基礎', summary: 'リストに作業を追加し、for文で一覧を表示できます。', sample: 'tasks = ["本を読む", "散歩"]\nfor task in tasks:\n    print(task)', output: '本を読む\n散歩', task: '2つの作業をリストにして、1行ずつ表示してください。', starter: '# 作業リストを作りfor文で表示しましょう\n', solution: 'tasks = ["本を読む", "散歩"]\nfor task in tasks:\n    print(task)', term: 'ToDoリスト', mistake: 'リストをそのまま表示し、要素ごとに出力しない' },
    { id: 'text-analysis', title: 'テキストの集計', summary: '文字列の分割やlen()を使って、文章の情報を数えられます。', sample: 'words = "Python を 学ぶ".split()\nprint(len(words))', output: '3', task: '「Python を 学ぶ」を単語に分け、個数を表示してください。', starter: '# split()とlen()で単語数を数えましょう\n', solution: 'words = "Python を 学ぶ".split()\nprint(len(words))', term: 'split()', mistake: '空白を含む文章を分割せずに数える' },
  ]),
  createCourse('advanced-python', '発展的なPython', '基礎を身につけた人向けに、読みやすく整理されたコードを学びます。', '応用', [
    { id: 'comprehension', title: 'リスト内包表記', summary: 'リスト内包表記は、短い繰り返しで新しいリストを作ります。', sample: 'squares = [n * n for n in range(1, 4)]\nprint(squares)', output: '[1, 4, 9]', task: '1から3の二乗をリスト内包表記で作って表示してください。', starter: '# range()とリスト内包表記を使いましょう\n', solution: 'squares = [n * n for n in range(1, 4)]\nprint(squares)', term: 'リスト内包表記', mistake: '内包表記の式と繰り返し部分の順序を逆にする' },
    { id: 'lambda', title: 'ラムダ式', summary: 'lambdaは短い関数をその場で作る書き方です。', sample: 'double = lambda value: value * 2\nprint(double(4))', output: '8', task: '受け取った数を2倍するlambda関数を作って4で試してください。', starter: '# lambdaで短い関数を定義しましょう\n', solution: 'double = lambda value: value * 2\nprint(double(4))', term: 'lambda', mistake: '複数行の複雑な処理をlambdaに詰め込む' },
    { id: 'type-hints', title: '型ヒント', summary: '型ヒントは、関数が受け取る値や返す値の種類を示します。', sample: 'def double(value: int) -> int:\n    return value * 2\nprint(double(4))', output: '8', task: '整数を受け取って整数を返すdouble関数を作ってください。', starter: '# 引数と戻り値に型ヒントを付けましょう\n', solution: 'def double(value: int) -> int:\n    return value * 2\nprint(double(4))', term: '型ヒント', mistake: '型ヒントが実行時に自動変換すると考える' },
    { id: 'assert-test', title: 'assertで確認する', summary: 'assertは条件が正しいことを確認し、テストの基礎になります。', sample: 'def add(a, b):\n    return a + b\nassert add(2, 3) == 5\nprint("テスト成功")', output: 'テスト成功', task: 'add関数を作り、2と3の合計が5になるassertを書いてください。', starter: '# 関数とassertで計算結果を確認しましょう\n', solution: 'def add(a, b):\n    return a + b\nassert add(2, 3) == 5\nprint("テスト成功")', term: 'assert', mistake: '確認する値と期待値の順を取り違える' },
  ]),
  createCourse('data-analysis', 'Pythonデータ分析', 'CSVやpandas、グラフを使った小さなデータ分析を学びます。', '応用', [
    { id: 'csv-basics', title: 'CSVデータを扱う', summary: 'CSVは表のデータをカンマ区切りのテキストで保存する形式です。', sample: 'import csv\nfrom io import StringIO\nfile = StringIO("name,score\\nAoi,80\\nRen,90")\nrows = list(csv.DictReader(file))\nprint(rows[0]["name"], rows[0]["score"])', output: 'Aoi 80', task: 'CSVを読み込み、最初の行のnameとscoreを表示してください。', starter: '# csv.DictReaderでCSVの行を読み込みましょう\n', solution: 'import csv\nfrom io import StringIO\nfile = StringIO("name,score\\nAoi,80\\nRen,90")\nrows = list(csv.DictReader(file))\nprint(rows[0]["name"], rows[0]["score"])', term: 'CSV', mistake: '数値列も最初は文字列として読み込まれる点を忘れる' },
    { id: 'pandas-dataframe', title: 'pandas DataFrame', summary: 'DataFrameは行と列でデータを整理する表形式のデータです。', sample: 'import pandas as pd\ndf = pd.DataFrame({"点数": [80, 90]})\nprint(df["点数"].mean())', output: '85.0', task: '点数80と90のDataFrameを作り、平均を表示してください。', starter: '# pandasでDataFrameを作成し、平均を求めましょう\n', solution: 'import pandas as pd\ndf = pd.DataFrame({"点数": [80, 90]})\nprint(df["点数"].mean())', term: 'DataFrame', mistake: '列名をDataFrameの列名と一致させない' },
    { id: 'matplotlib', title: 'Matplotlibでグラフを作る', summary: 'Matplotlibは数値をグラフとして見える形にするライブラリです。', sample: 'import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [2, 4, 3])\nplt.title("Sample")\nprint("グラフを作成しました")', output: 'グラフを作成しました', task: 'Matplotlibで3点の折れ線グラフを作成し、メッセージを表示してください。', starter: '# pyplotで折れ線グラフを作成しましょう\n', solution: 'import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [2, 4, 3])\nplt.title("Sample")\nprint("グラフを作成しました")', term: 'Matplotlib', mistake: 'グラフのデータ配列の長さを一致させない' },
  ]),
)

const courseOrder = [
  'python-intro',
  'variable-types',
  'operators',
  'user-input',
  'conditionals',
  'loops',
  'sequences',
  'dictionary-strings',
  'functions',
  'files-errors-modules',
  'object-oriented',
  'practical-programming',
  'advanced-python',
  'data-analysis',
]
learningCourses.sort((left, right) => courseOrder.indexOf(left.id) - courseOrder.indexOf(right.id))

const legacySyntax: Record<string, string> = {
  'python-what-is-python': 'print("表示したい文字")',
  'python-print-basics': 'print(値1, 値2)',
  'variables-intro': '変数名 = 値',
  'types-and-conversion': 'int("12") / float("1.5") / str(値)',
  'if-else-basics': 'if 条件:\n    処理\nelse:\n    別の処理',
  'comparison-operators': '値1 == 値2 / 値1 >= 値2 / 値1 != 値2',
}

for (const lesson of learningCourses.flatMap((course) => course.lessons)) {
  lesson.explanation ??= `${lesson.summary} サンプルコードを読むときは、各行の実行順と、変数に入る値・画面に表示される値の違いに注目してください。`
  lesson.syntax ??= legacySyntax[lesson.id] ?? syntaxByTerm[lesson.terms[0]?.term ?? ''] ?? lesson.sampleCode.split('\n')[0] ?? ''
  lesson.sampleLineExplanations ??= lesson.sampleCode.split('\n').map(explainSampleLine)
  for (const term of lesson.terms) {
    term.reading = term.reading === 'レッスンのキーワード'
      ? termReadings[term.term] ?? term.term
      : term.reading
    term.usage ??= term.meaning
    term.exampleCode ??= lesson.sampleCode
    term.exampleOutput ??= lesson.expectedOutput
    term.relatedTerms ??= lesson.terms.filter((other) => other.term !== term.term).map((other) => other.term)
  }
}

export const lessonMap = new Map(learningCourses.flatMap((course) => course.lessons.map((lesson) => [lesson.id, lesson])))
export const allLessons = learningCourses.flatMap((course) => course.lessons)
export const firstLessonId = allLessons[0]?.id ?? ''
