"use client";

// prep 学習データ（user-scope）の変更・ハイドレートを購読し、
// 変わるたびにインクリメントするバージョン番号を返すフック。
// 読み取り系の useEffect の依存配列に含めると、ログイン後の
// Firestore ハイドレート完了時に自動で再取得できる。

import { useEffect, useState } from "react";
import { subscribePrepData } from "./user-scope";

export function usePrepDataVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribePrepData(() => setVersion((v) => v + 1)), []);
  return version;
}
