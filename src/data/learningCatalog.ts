import type { LearningCourse } from '../types/learning'

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
          expectedOutput: 'Taro\n16',
          hints: ['名前と年齢を保存する箱を2つ用意します。', '変数への代入には = を使います。', '例: name = "Taro" の後に print(name) と書きます。'],
          solution: 'name = "Taro"\nage = 16\nprint(name)\nprint(age)',
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
          prompt: '年齢が 18 以上なら「大人」、それ以外は「未成年」と表示するコードを書いてください。',
          starter: '# ageに16を入れ、18以上かどうかで表示を切り替えましょう\n',
          expectedOutput: '未成年',
          hints: ['年齢の値を用意し、条件によって表示を分けます。', '18以上の判定には >= を使います。', 'if age >= 18: の後に大人、else: の後に未成年を表示します。'],
          solution: 'age = 16\nif age >= 18:\n    print("大人")\nelse:\n    print("未成年")',
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
    lessons: seeds.map((seed) => {
      const lessonId = `${id}-${seed.id}`
      const wrongChoices = ['エラーになる', '何も表示されない', '結果は0になる']
        .filter((choice) => choice !== seed.output)
        .slice(0, 2)
      return {
        id: lessonId,
        courseId: id,
        title: seed.title,
        summary: seed.summary,
        objective: [`${seed.title}の使い方を知る`, 'コードを実行し、結果を確かめる'],
        keyPoints: [seed.summary, `基本の書き方をサンプルで動かし、少しずつ試すことが大切です。`],
        terms: [{
          term: seed.term,
          reading: 'レッスンのキーワード',
          meaning: seed.summary,
        }],
        sampleCode: seed.sample,
        expectedOutput: seed.output,
        commonMistakes: [seed.mistake, 'かっこ・引用符・インデントを見直す'],
        nextStep: `次は「${seed.title}」を別の値や書き方でも試してみましょう。`,
        practice: {
          title: `${seed.title}を使ってみよう`,
          prompt: seed.task,
          starter: seed.starter,
          expectedOutput: seed.output,
          hints: [
            seed.summary,
            `${seed.term}を使う場所と、値を表示する方法を確認しましょう。`,
            `次のような形を出発点にできます: ${seed.solution.split('\n')[0]}`,
          ],
          solution: seed.solution,
        },
        quiz: {
          id: `${lessonId}-quiz`,
          question: 'サンプルコードを実行すると、何が表示されますか。',
          choices: [seed.output, ...wrongChoices],
          answer: seed.output,
          explanation: `サンプルの処理を上から順に追うと「${seed.output}」になります。`,
        },
      }
    }),
  }
}

learningCourses.push(
  createCourse('operators', '演算子と計算', '計算、比較、条件の組み立て方を身につけます。', '初級', [
    { id: 'addition', title: '足し算', summary: 'プラス記号で数を足せます。', sample: 'print(4 + 3)', output: '7', task: '4と3を足して結果を表示してください。', starter: '# 足し算の結果を表示しましょう\n', solution: 'print(4 + 3)', term: '+', mistake: '文字列の足し算と数値の足し算を混同する' },
    { id: 'subtraction', title: '引き算', summary: 'マイナス記号で数を引けます。', sample: 'print(10 - 4)', output: '6', task: '10から4を引いて表示してください。', starter: '# 引き算の結果を表示しましょう\n', solution: 'print(10 - 4)', term: '-', mistake: '引く順番を逆にする' },
    { id: 'multiplication', title: '掛け算', summary: 'アスタリスク * で掛け算をします。', sample: 'print(6 * 7)', output: '42', task: '6と7を掛けた結果を表示してください。', starter: '# * を使って掛け算をしましょう\n', solution: 'print(6 * 7)', term: '*', mistake: '掛け算に x ではなく * を使う' },
    { id: 'division-remainder', title: '割り算と余り', summary: '/ は割り算、% は割った余りを求めます。', sample: 'print(9 / 2)\nprint(9 % 2)', output: '4.5\n1', task: '9を2で割った商と余りを順番に表示してください。', starter: '# / と % を使って結果を2行で表示しましょう\n', solution: 'print(9 / 2)\nprint(9 % 2)', term: '%', mistake: '商と余りを同じ演算子で計算する' },
    { id: 'comparison', title: '比較演算子', summary: '比較演算子は条件が正しいかをTrueまたはFalseで返します。', sample: 'print(8 >= 5)\nprint(3 == 5)', output: 'True\nFalse', task: '8が5以上か、3が5と等しいかを表示してください。', starter: '# 2つの比較結果を表示しましょう\n', solution: 'print(8 >= 5)\nprint(3 == 5)', term: '比較演算子', mistake: '等しいかの比較に = を1つだけ使う' },
  ]),
  createCourse('user-input', 'input()と型変換', 'ユーザーから値を受け取り、計算で使う方法を学びます。', '初級', [
    { id: 'input-string', title: 'input()で入力する', summary: 'input()はユーザーが入力した文字を受け取ります。', sample: 'name = input("名前: ")\nprint("こんにちは", name)', output: 'こんにちは PyStudio', task: 'input()で受け取った名前を「こんにちは」と一緒に表示してください。入力値はPyStudioで「PyStudio」と入力します。', starter: '# input()で名前を受け取りましょう\n', solution: 'name = input("名前: ")\nprint("こんにちは", name)', term: 'input()', mistake: '入力された値は文字列であることを忘れる' },
    { id: 'input-to-int', title: '入力を整数に変換する', summary: 'int()を使うと、数字の文字列を整数に変えられます。', sample: 'value = int("12")\nprint(value + 3)', output: '15', task: '文字列 "12" をint()で整数にして3を足し、表示してください。', starter: '# int()で文字を数に変換しましょう\n', solution: 'value = int("12")\nprint(value + 3)', term: 'int()', mistake: '文字列のまま数値計算しようとする' },
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
    { id: 'dict-create', title: '辞書を作る', summary: '辞書はキーと値を組み合わせて保存します。', sample: 'person = {"name": "Aoi"}\nprint(person["name"])', output: 'Aoi', task: 'nameをキー、Aoiを値にした辞書から名前を表示してください。', starter: '# nameをキーにした辞書を作成しましょう\n', solution: 'person = {"name": "Aoi"}\nprint(person["name"])', term: 'dict', mistake: '値を取り出すときにキーを引用符で囲み忘れる' },
    { id: 'dict-update', title: '辞書を更新する', summary: '辞書はキーを指定して値を追加・変更できます。', sample: 'stock = {"apple": 3}\nstock["apple"] = 4\nprint(stock["apple"])', output: '4', task: '在庫を3から4に更新して表示してください。', starter: '# 辞書の値を更新しましょう\n', solution: 'stock = {"apple": 3}\nstock["apple"] = 4\nprint(stock["apple"])', term: 'キー', mistake: '存在しないキーと既存キーを区別しない' },
    { id: 'string-methods', title: '文字列のメソッド', summary: '文字列には大文字小文字変換などの便利な機能があります。', sample: 'word = "python"\nprint(word.upper())', output: 'PYTHON', task: 'pythonを大文字にして表示してください。', starter: '# upper()で文字を大文字にしましょう\n', solution: 'word = "python"\nprint(word.upper())', term: 'upper()', mistake: 'メソッドの後ろの()を書き忘れる' },
    { id: 'split-join', title: 'split()とjoin()', summary: 'split()は文字列を分け、join()は文字列をつなぎます。', sample: 'words = "a,b,c".split(",")\nprint("-".join(words))', output: 'a-b-c', task: 'カンマ区切りの"a,b,c"をハイフンでつないで表示してください。', starter: '# split()とjoin()を組み合わせましょう\n', solution: 'words = "a,b,c".split(",")\nprint("-".join(words))', term: 'split()', mistake: 'join()をリストではなく単一の文字列に使う' },
    { id: 'f-strings', title: 'f文字列', summary: 'f文字列を使うと文章に変数の値を埋め込めます。', sample: 'name = "Aoi"\nprint(f"こんにちは、{name}さん")', output: 'こんにちは、Aoiさん', task: 'nameの値Aoiをf文字列に入れて挨拶を表示してください。', starter: '# f文字列でnameを表示しましょう\n', solution: 'name = "Aoi"\nprint(f"こんにちは、{name}さん")', term: 'f文字列', mistake: '文字列の先頭にfを付け忘れる' },
  ]),
  createCourse('functions', '関数', '処理を名前の付いたまとまりにして、再利用する方法を学びます。', '中級', [
    { id: 'def', title: '関数を定義する', summary: 'defで関数を作り、名前を付けた処理を呼び出せます。', sample: 'def greet():\n    print("こんにちは")\ngreet()', output: 'こんにちは', task: 'greetという関数を作り、「こんにちは」と表示してください。', starter: '# defでgreet関数を作って呼び出しましょう\n', solution: 'def greet():\n    print("こんにちは")\ngreet()', term: 'def', mistake: '関数を定義しただけで呼び出さない' },
    { id: 'arguments', title: '引数を使う', summary: '引数を使うと関数に値を渡せます。', sample: 'def greet(name):\n    print("こんにちは", name)\ngreet("Aoi")', output: 'こんにちは Aoi', task: '名前を受け取るgreet関数でAoiに挨拶してください。', starter: '# 引数nameを持つgreet関数を定義しましょう\n', solution: 'def greet(name):\n    print("こんにちは", name)\ngreet("Aoi")', term: '引数', mistake: '関数定義と呼び出しで引数の数を合わせない' },
    { id: 'return', title: '戻り値を返す', summary: 'returnは関数の計算結果を呼び出し元に返します。', sample: 'def add(a, b):\n    return a + b\nprint(add(2, 3))', output: '5', task: '2つの数を足して返すadd関数を作り、2と3で試してください。', starter: '# returnを使うadd関数を作りましょう\n', solution: 'def add(a, b):\n    return a + b\nprint(add(2, 3))', term: 'return', mistake: 'returnとprintの役割を混同する' },
    { id: 'scope', title: '変数のスコープ', summary: '関数内で作った変数は、基本的に関数の外から直接使えません。', sample: 'def make_message():\n    message = "準備OK"\n    return message\nprint(make_message())', output: '準備OK', task: '関数内のmessageをreturnで返して表示してください。', starter: '# 関数内の値をreturnで外へ返しましょう\n', solution: 'def make_message():\n    message = "準備OK"\n    return message\nprint(make_message())', term: 'スコープ', mistake: '関数内の変数を外で直接参照する' },
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
    { id: 'grade-management', title: '成績管理', summary: 'リストの数値を集計し、全体の平均を計算できます。', sample: 'scores = [80, 90, 70]\nprint(sum(scores) / len(scores))', output: '80.0', task: '80、90、70の平均点をsum()とlen()で求めてください。', starter: '# リストの合計を件数で割りましょう\n', solution: 'scores = [80, 90, 70]\nprint(sum(scores) / len(scores))', term: 'sum()', mistake: '平均を求めるときに件数で割り忘れる' },
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

export const lessonMap = new Map(learningCourses.flatMap((course) => course.lessons.map((lesson) => [lesson.id, lesson])))
export const allLessons = learningCourses.flatMap((course) => course.lessons)
export const firstLessonId = allLessons[0]?.id ?? ''
