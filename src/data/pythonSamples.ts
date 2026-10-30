export interface PythonSample {
  id: string
  title: string
  category: '基本' | '制御構文' | 'データ' | '応用'
  code: string
}

export const pythonSamples: PythonSample[] = [
  { id: 'hello-world', title: 'Hello World', category: '基本', code: 'print("Hello, world!")\n' },
  { id: 'variables', title: '変数', category: '基本', code: 'name = "PyStudio"\ncount = 3\nprint(f"{name}: {count}")\n' },
  { id: 'conditionals', title: '条件分岐', category: '制御構文', code: 'score = 82\nif score >= 80:\n    print("合格です")\nelse:\n    print("もう少しです")\n' },
  { id: 'for-loop', title: 'for文', category: '制御構文', code: 'for number in range(1, 6):\n    print(number)\n' },
  { id: 'while-loop', title: 'while文', category: '制御構文', code: 'count = 3\nwhile count > 0:\n    print(count)\n    count -= 1\nprint("スタート!")\n' },
  { id: 'functions', title: '関数', category: '基本', code: 'def greet(name):\n    return f"こんにちは、{name}さん"\n\nprint(greet("Python"))\n' },
  { id: 'lists', title: 'リスト', category: 'データ', code: 'fruits = ["りんご", "みかん", "ぶどう"]\nfruits.append("もも")\nfor fruit in fruits:\n    print(fruit)\n' },
  { id: 'dictionaries', title: '辞書', category: 'データ', code: 'profile = {"name": "Aoi", "level": "beginner"}\nfor key, value in profile.items():\n    print(f"{key}: {value}")\n' },
  { id: 'classes', title: 'クラス', category: '基本', code: 'class Dog:\n    def __init__(self, name):\n        self.name = name\n\n    def speak(self):\n        print(f"{self.name}: ワン!")\n\nDog("ポチ").speak()\n' },
  { id: 'file-operations', title: 'ファイル操作', category: '応用', code: 'with open("sample.txt", "w", encoding="utf-8") as file:\n    file.write("PyStudioから保存しました")\n\nwith open("sample.txt", encoding="utf-8") as file:\n    print(file.read())\n' },
  { id: 'graph-creation', title: 'グラフ作成', category: '応用', code: 'import matplotlib.pyplot as plt\n\nx = [1, 2, 3, 4, 5]\ny = [2, 4, 6, 8, 10]\nplt.plot(x, y)\nplt.title("Sample chart")\nplt.show()\n' },
  { id: 'pandas-basics', title: 'pandas基本操作', category: '応用', code: 'import pandas as pd\n\ndata = {"商品": ["りんご", "みかん", "ぶどう"], "価格": [150, 100, 300], "在庫": [12, 20, 5]}\ndf = pd.DataFrame(data)\n\n# print()は文字で出力し、display()は実行情報に表を表示します\nprint("商品データを表で確認します")\ndisplay(df)\n\n# 1列を取り出したSeriesも表で表示できます\nprices = df["価格"]\ndisplay(prices)\nprint("平均価格:", prices.mean())\n# 表の「コピー」や「CSV」ボタンから表示中のデータを保存できます\n' },
]

export function getPythonSample(id: string): PythonSample {
  const sample = pythonSamples.find((entry) => entry.id === id)
  if (!sample) throw new Error(`Unknown Python sample: ${id}`)
  return sample
}
