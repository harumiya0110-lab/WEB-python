import type { LearningTerm } from '../types/learning'

export interface PythonGlossaryEntry extends LearningTerm {
  lessonId: string
}

export const pythonGlossary: PythonGlossaryEntry[] = [
  {
    term: 'Python', reading: 'ぱいそん', meaning: '読みやすさを大切にした汎用プログラミング言語です。',
    usage: 'Webアプリ、データ分析、自動化など幅広い用途で使われます。',
    exampleCode: 'print("Hello, Python!")', exampleOutput: 'Hello, Python!',
    lessonId: 'python-what-is-python', category: '基本',
  },
  {
    term: 'プログラム', reading: 'ぷろぐらむ', meaning: 'コンピューターに実行させる命令を、順序立ててまとめたものです。',
    usage: '入力を受け取り、処理し、結果を出す手順を作るときに使います。',
    exampleCode: 'price = 120\nprint(price)', exampleOutput: '120',
    lessonId: 'python-what-is-python', category: '基本',
  },
  {
    term: 'コード', reading: 'こーど', meaning: 'プログラムを記述するために書くPythonの文です。',
    usage: 'エディターに入力し、Pythonに実行させる命令を表します。',
    exampleCode: 'print("実行します")', exampleOutput: '実行します',
    lessonId: 'python-what-is-python', category: '基本',
  },
  {
    term: '実行', reading: 'じっこう', meaning: '書いたプログラムをPythonに処理させることです。',
    usage: 'コードが意図した結果を出すか確かめるときに行います。',
    exampleCode: 'print(2 + 3)', exampleOutput: '5',
    lessonId: 'python-what-is-python', category: '基本',
  },
  {
    term: '値', reading: 'あたい', meaning: '数値、文字列、真偽値など、プログラムが扱うデータです。',
    usage: '変数に保存したり、計算や条件判定に使ったりします。',
    exampleCode: 'score = 85\nprint(score)', exampleOutput: '85',
    lessonId: 'variables-intro', category: '変数・データ型',
  },
  {
    term: 'str', reading: 'すとりんぐ', meaning: '文字列を表すPythonの型です。',
    usage: '文字列であることを明示したり、値を文字列へ変換するときに使います。',
    exampleCode: 'age = 16\nprint(str(age) + "歳")', exampleOutput: '16歳',
    lessonId: 'types-and-conversion', category: '変数・データ型',
  },
  {
    term: 'int', reading: 'いんと', meaning: '整数を表すPythonの型です。',
    usage: '数字の文字列を整数へ変換し、計算に使うときに利用します。',
    exampleCode: 'number = int("12")\nprint(number + 3)', exampleOutput: '15',
    lessonId: 'types-and-conversion', category: '変数・データ型',
  },
  {
    term: 'float', reading: 'ふろーと', meaning: '小数を含む数値を表すPythonの型です。',
    usage: '小数を含む測定値や価格などの計算に使います。',
    exampleCode: 'price = float("1.5")\nprint(price * 2)', exampleOutput: '3.0',
    lessonId: 'user-input-input-float', category: '変数・データ型',
  },
  {
    term: 'bool', reading: 'ぶーる', meaning: 'True（真）またはFalse（偽）を表す型です。',
    usage: '比較や条件式の結果を扱うときに使います。',
    exampleCode: 'is_adult = 20 >= 18\nprint(is_adult)', exampleOutput: 'True',
    lessonId: 'comparison-operators', category: '条件分岐',
  },
  {
    term: 'None', reading: 'なん', meaning: '値が存在しないことを表す特別な値です。',
    usage: '関数が結果を返さない場合や、値が未設定であることを示すときに使います。',
    exampleCode: 'result = None\nprint(result is None)', exampleOutput: 'True',
    lessonId: 'types-and-conversion', category: '変数・データ型',
  },
  {
    term: 'elif', reading: 'えるいふ', meaning: 'ifの条件が偽だった場合に、別の条件を続けて調べる文です。',
    usage: '点数の範囲など、複数の分岐を順番に判定するときに使います。',
    exampleCode: 'score = 75\nif score >= 80:\n    print("合格")\nelif score >= 60:\n    print("追試")\nelse:\n    print("再受験")',
    exampleOutput: '追試', lessonId: 'if-else-basics', category: '条件分岐',
  },
  {
    term: 'else', reading: 'えるす', meaning: 'それまでのifやelifの条件がどれも成り立たない場合に実行する分岐です。',
    usage: '条件に一致しなかった場合の処理を明確にするときに使います。',
    exampleCode: 'age = 16\nif age >= 18:\n    print("大人")\nelse:\n    print("未成年")',
    exampleOutput: '未成年', lessonId: 'if-else-basics', category: '条件分岐',
  },
  {
    term: 'continue', reading: 'こんてぃにゅー', meaning: '現在の繰り返しの残りを飛ばし、次の回へ進む文です。',
    usage: '特定の値だけを処理対象から除外するときに使います。',
    exampleCode: 'for number in range(3):\n    if number == 1:\n        continue\n    print(number)',
    exampleOutput: '0\n2', lessonId: 'loops-break-continue', category: '繰り返し',
  },
  {
    term: 'pass', reading: 'ぱす', meaning: '何も処理を行わないことを示す文です。',
    usage: '関数やクラスなどの構造を先に作り、後で処理を追加するときに使います。',
    exampleCode: 'class Student:\n    pass\n\nprint("クラスを定義しました")',
    exampleOutput: 'クラスを定義しました', lessonId: 'object-oriented-class-instance', category: 'クラス',
  },
  {
    term: 'from', reading: 'ふろむ', meaning: 'モジュールから特定の機能を選んで読み込むときに使うキーワードです。',
    usage: 'モジュール名を毎回書かずに、その機能を使いたいときに利用します。',
    exampleCode: 'from math import sqrt\nprint(sqrt(16))', exampleOutput: '4.0',
    lessonId: 'files-errors-modules-import-module', category: '基本',
  },
  {
    term: 'as', reading: 'あず', meaning: '読み込んだモジュールや値に別名を付けるキーワードです。',
    usage: 'モジュール名を短くしたり、with文の値を変数名で受け取ったりします。',
    exampleCode: 'import math as m\nprint(m.sqrt(9))', exampleOutput: '3.0',
    lessonId: 'files-errors-modules-import-module', category: '基本',
  },
  {
    term: 'finally', reading: 'ふぁいなりー', meaning: '例外が起きても起きなくても、最後に実行する処理を記述する節です。',
    usage: '後片付けなど、必ず実行したい処理をまとめるときに使います。',
    exampleCode: 'try:\n    print("処理")\nfinally:\n    print("終了")',
    exampleOutput: '処理\n終了', lessonId: 'files-errors-modules-try-except', category: '例外処理',
  },
  {
    term: 'raise', reading: 'れいず', meaning: 'プログラムから例外を発生させる文です。',
    usage: '受け付けられない値など、処理を続けられない条件を通知するときに使います。',
    exampleCode: 'def require_positive(number):\n    if number <= 0:\n        raise ValueError("正の数が必要です")\n    return number',
    exampleOutput: '', lessonId: 'files-errors-modules-try-except', category: '例外処理',
  },
  {
    term: 'Series', reading: 'しりーず', meaning: 'pandasで使う、インデックスを持つ1次元のデータ構造です。',
    usage: '表の1列など、ラベル付きの1次元データを扱うときに利用します。',
    exampleCode: 'import pandas as pd\nscores = pd.Series([80, 90], index=["Aoi", "Ren"])\nprint(scores["Aoi"])',
    exampleOutput: '80', lessonId: 'data-analysis-pandas-dataframe', category: 'データ分析',
  },
  {
    term: 'read_csv', reading: 'りーどしーえすぶい', meaning: 'pandasでCSVファイルをDataFrameとして読み込む関数です。',
    usage: 'CSV形式で保存された表データを分析するときに使います。',
    exampleCode: 'from io import StringIO\nimport pandas as pd\ncsv = StringIO("name,score\\nAoi,80")\ndata = pd.read_csv(csv)\nprint(data.loc[0, "score"])',
    exampleOutput: '80', lessonId: 'data-analysis-csv-basics', category: 'データ分析',
  },
  {
    term: 'pyplot', reading: 'ぱいぷろっと', meaning: 'Matplotlibでグラフの作成や表示を行うためのインターフェースです。',
    usage: '数値データの傾向を折れ線や棒グラフで可視化するときに使います。',
    exampleCode: 'import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [2, 4, 3])\nplt.show()\nprint("グラフを作成しました")',
    exampleOutput: 'グラフを作成しました', lessonId: 'data-analysis-matplotlib', category: 'データ分析',
  },
]
