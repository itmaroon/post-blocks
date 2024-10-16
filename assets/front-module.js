import apiFetch from "@wordpress/api-fetch";
import { __ } from "@wordpress/i18n";
import { format, getSettings } from "@wordpress/date";

import { StyleComp as StyleGroup } from "../../block-collections/src/blocks/design-group/StyleGroup";
import { StyleComp as StyleButton } from "../../block-collections/src/blocks/design-button/StyleButton";
import { createRoot } from "react-dom/client";
import { restTaxonomies, getPeriodQuery } from "itmar-block-packages";

// プロミスを格納する配列
const promises = [];
//タームによるフィルタを格納する変数
let termQueryObj = [];
//期間のオブジェクトを格納する変数
let periodQueryObj = {};
//キーワードを格納する変数
let searchKeyWord = "";

const getBlockMapValue = (blockMap, fieldName) => {
	//blockMapのキーが.で区切られている場合は、最後の.の後の文字列から
	for (const key in blockMap) {
		if (key.includes(".")) {
			const lastDotIndex = key.lastIndexOf(".");
			const keyFieldName = key.slice(lastDotIndex + 1);
			if (keyFieldName === fieldName) {
				return blockMap[key];
			}
		}
	}
	return blockMap[fieldName];
};

//カスタムフィールドを検索する関数
const searchFieldObjects = (obj, fieldKey) => {
	let result = null;

	for (const key in obj) {
		if (key === fieldKey) {
			result = obj[key];
			break;
		} else if (typeof obj[key] === "object") {
			const nestedResult = searchFieldObjects(obj[key], fieldKey);
			if (nestedResult !== null) {
				result = nestedResult;
				break;
			}
		}
	}

	return result;
};

//RestAPIで投稿データを取得する関数（Promiseを返す）
const getSearchRecordsFromAPI = async (query) => {
	const queryString = new URLSearchParams(query).toString();

	try {
		const response = await fetch(
			`${post_blocks.home_url}/wp-json/itmar-rest-api/v1/search?${queryString}`,
		);
		const data = await response.json();
		return data;

		// データの処理
	} catch (error) {
		console.error("Failed to fetch posts:", error);
	}
};

//RestAPIでメディア情報を取得する関数（Promiseを返す）
const getMediaInfoFromAPI = async (mediaId) => {
	const path = `/wp/v2/media/${mediaId}`;
	const mediaInfo = await apiFetch({ path });
	return mediaInfo;
};

const getSelectedTaxonomyTerms = (choiceTerms, taxRelateType) => {
	const taxonomyTerms = choiceTerms.reduce((acc, { taxonomy, term }) => {
		if (acc.hasOwnProperty(taxonomy)) {
			acc[taxonomy] = `${acc[taxonomy]},${term.id}`;
		} else {
			acc[taxonomy] = term.id;
		}

		return acc;
	}, {});

	return {
		...taxonomyTerms,
		tax_relation: taxRelateType,
	};
};

const ModifyFieldElement = (element, post, blockMap) => {
	// newPostUnitのすべての子要素を取得
	const allElements = element.getElementsByTagName("*");

	// 各要素を反復処理
	for (let i = 0; i < allElements.length; i++) {
		const element = allElements[i];

		// 要素のクラス名を取得
		const classNames = element.className.split(" ");

		// field_を含むクラス名があるかチェック
		const hasFieldClass = classNames.some((className) =>
			className.startsWith("field_"),
		);

		if (hasFieldClass) {
			// field_を含むクラス名がある場合、そのクラス内のDOM要素を書き換える
			const fieldClassName = classNames.find((className) =>
				className.startsWith("field_"),
			);
			// field_を除いたクラス名を取得
			const fieldName = fieldClassName.replace("field_", "");
			// postオブジェクト内で、そのクラス名をキーとする値を取得

			//カスタムフィールドの値取得
			const costumFieldValue = searchFieldObjects(
				{ ...post.acf, ...post.meta },
				fieldName,
			);
			//ビルトインのフィールド名があればその値をとり、なければカスタムフィールドの値をとる
			const fieldValue = post[fieldName] || costumFieldValue;
			//フィールドとブロックの対応マップからブロック名を抽出

			const blockName = getBlockMapValue(blockMap, fieldName);

			//フィールドの種類によって書き換え方が変わる
			switch (blockName) {
				case "itmar/design-title":
					const hElement = element.querySelector("h1, h2, h3, h4, h5, h6");

					if (hElement) {
						// h要素内のdivを探す
						const divElement = hElement.querySelector("div");
						//titleTypeを取り出す
						const titleType = element.getAttribute("data-title_type");

						if (divElement) {
							// divのテキストノードを書き換える
							if (fieldName === "date") {
								//デザインタイトルのタイトルタイプがdateならフォーマットをあてる
								if (titleType === "date") {
									//date_formatを取り出す
									const dateFormat = element.getAttribute("data-date_format");
									divElement.textContent = format(
										dateFormat,
										fieldValue,
										getSettings(),
									);
								} else {
									divElement.textContent = fieldValue;
								}
							} else if (fieldName === "title") {
								divElement.textContent = fieldValue.rendered;
							} else {
								divElement.textContent = fieldValue;
							}
						}
					}
					break;

				case "core/paragraph":
					// pの内容を書き換える
					if (fieldName === "excerpt") {
						element.innerHTML = fieldValue.rendered;
					} else {
						element.innerHTML = fieldValue;
					}

					break;
				case "core/image":
					const iElement = element.querySelector("img");
					// 現在のmediaIdを取得（イメージ要素にクラス名がある場合）

					const currentMediaId = iElement.classList
						.toString()
						.match(/wp-image-(\d+)/)
						? iElement.classList.toString().match(/wp-image-(\d+)/)[1]
						: undefined;

					if (iElement) {
						if (!fieldValue && currentMediaId) {
							//mediaIDがセットされていなければノーイメージ画像を設定して終了
							iElement.classList.remove(`wp-image-${currentMediaId}`);
							iElement.classList.add("wp-image-000");
							iElement.removeAttribute("srcset");
							iElement.style.objectFit = "contain";
							iElement.src = `${post_blocks.plugin_url}/assets/no-image.png`;
							iElement.alt = __("There is no image set.", "post-blocks");
							break;
						}

						promises.push(
							getMediaInfoFromAPI(fieldValue)
								.then((data) => {
									// 必要なデータを抽出
									const newSrc = data.source_url;
									const newSrcset = Object.entries(data.media_details.sizes)
										.map(([name, size]) => `${size.source_url} ${size.width}w`)
										.join(", ");
									const newWidth = data.media_details.width;
									const newHeight = data.media_details.height;
									const newAlt = data.alt_text;

									// img要素の属性を更新
									iElement.src = newSrc;
									iElement.srcset = newSrcset;
									iElement.width = newWidth;
									iElement.height = newHeight;
									iElement.alt = newAlt;
									// クラス名を更新
									iElement.classList.remove(`wp-image-${currentMediaId}`);
									iElement.classList.add(`wp-image-${fieldValue}`);
								})
								.catch((error) => {
									//画像が見つからない場合の処理
									if (error.data?.status == 404) {
										iElement.classList.remove(`wp-image-${currentMediaId}`);
										iElement.classList.add("wp-image-000");
										iElement.removeAttribute("srcset");
										iElement.style.objectFit = "contain";
										iElement.src = `${post_blocks.plugin_url}/assets/no-image.png`;
										iElement.alt = __("There is no image set.", "post-blocks");
									}
								}),
						);
					}

					break;
			}
		}
	}
};

//ピックアップ投稿の表示（ダイナミックブロックと同様の表示）・ページネーションの処理
const pickupChange = (pickup, fillFlg, currentPage = 0) => {
	const pickupId = pickup.dataset.pickup_id;
	const numberOfItems = pickup.dataset.number_of_items;
	//const selectedRest = pickup.dataset.selected_rest;
	const selectedSlug = pickup.dataset.selected_slug;
	const taxRelateType = pickup.dataset.tax_relate_type;
	const searchFields = JSON.parse(pickup.dataset.search_fields);
	//const choiceTerms = JSON.parse(pickup.dataset.choice_terms);
	const blockMap = JSON.parse(pickup.dataset.block_map);

	//タームのセレクトオブジェクト
	const selectTerms = getSelectedTaxonomyTerms(termQueryObj, taxRelateType);

	//全体のクエリオブジェクト
	const query = {
		search: searchKeyWord,
		search_fields: searchFields,
		post_type: selectedSlug,
		per_page: numberOfItems,
		page: currentPage + 1,
		...selectTerms,
		...periodQueryObj,
	};

	//カスタムエンドポイントから投稿データを取得
	getSearchRecordsFromAPI(query)
		.then((data) => {
			console.log(data);
			const posts = data.posts;
			//swiperFlgの値でデータの入れ替え要素を峻別
			const divElements = !fillFlg
				? Array.from(pickup.querySelectorAll(".post_unit")[0].children)
				: Array.from(pickup.parentElement.children).filter(
						(child) =>
							child !== pickup && child.classList.contains("swiper-slide"),
				  );
			if (!divElements.length > 0) return; //post_unitクラスの要素がなければリターン

			divElements.forEach((divs, index) => {
				if (!posts[index]) {
					divs.style.display = "none"; // 要素を非表示にする
				} else {
					//レンダリング指定のあるフィールドの内容をpostの内容によって書き換え
					ModifyFieldElement(divs, posts[index], blockMap);
					divs.style.display = "block"; // 要素を再表示する
				}
			});
			// すべてのプロミスが完了したら非表示のクラスを外す
			Promise.all(promises)
				.then(() => {
					const postUnits = fillFlg
						? document.querySelectorAll(".swiper-slide")
						: document.querySelectorAll(".post_unit");
					postUnits.forEach((unit) => {
						//非表示のクラスを外す
						unit.classList.remove("unit_hide");
					});
				})
				.catch((error) => console.error(error));

			//ページネーションのレンダリング
			const pagenationRoot = document.getElementById(`page_${pickupId}`);

			if (pagenationRoot && pagenationRoot.dataset.group_attributes) {
				const pagention = createRoot(pagenationRoot); //ページネーションのルート要素
				//トータルのページ数を算出
				const totalPages = Math.ceil(data.total / numberOfItems);

				//totalPagesが２ページ以上
				if (totalPages > 1) {
					//ダミーボタンフラグ
					let isDummy = false;
					//ページネーションボタンの生成
					const pagenationButtons = (count) => {
						//カレントページを軸にページ番号ボタンを生成
						let forwardNum =
							currentPage -
							(Math.ceil((pagenationRoot.dataset.disp_items - 2) / 2) - 1);
						let backNum =
							currentPage +
							(Math.ceil((pagenationRoot.dataset.disp_items - 2) / 2) - 1);
						if (pagenationRoot.dataset.disp_items % 2 == 0) {
							//偶数の時は後ろに幅を持たせる
							backNum++;
						}

						if (forwardNum <= 0) {
							//0ページより前ならbackNumに回す
							backNum += forwardNum * -1 + 1;
							forwardNum = 1;
						}
						if (backNum >= totalPages - 1) {
							//トータルページのページ数を超えたら超えた分をforwardNumに回す
							forwardNum -= backNum - totalPages + 2;
							backNum = totalPages - 2;
						}
						return [...Array(count).keys()].map((index) => {
							//最初と最後およびカレントページ番号の前後で表示数の範囲は番号ボタン
							if (
								index === 0 ||
								index === count - 1 ||
								(index >= forwardNum && index <= backNum)
							) {
								isDummy = false; //ダミーボタンフラグを下げる
								return (
									<StyleButton
										key={index}
										attributes={JSON.parse(
											pagenationRoot.dataset.num_attributes,
										)}
									>
										<button
											onClick={() => {
												pickupChange(pickup, fillFlg, index);
											}}
											disabled={index == currentPage}
										>
											<div>{index + 1}</div>
										</button>
									</StyleButton>
								);
							} else {
								//それ以外はダミーボタン
								if (!isDummy) {
									//ダミーボタンは連続して表示させない
									isDummy = true;
									return (
										<StyleButton
											key={index}
											attributes={JSON.parse(
												pagenationRoot.dataset.dummy_attributes,
											)}
										>
											<button disabled={true}>
												<div>...</div>
											</button>
										</StyleButton>
									);
								}
							}
						});
					};

					pagention.render(
						<StyleGroup
							attributes={JSON.parse(pagenationRoot.dataset.group_attributes)}
						>
							<div class="wp-block-itmar-design-group">
								<div
									className={`group_contents ${
										pagenationRoot.dataset.is_anime ? "fadeTrigger" : ""
									}`}
									data-is_anime={pagenationRoot.dataset.is_anime}
									data-anime_prm={JSON.stringify(
										pagenationRoot.dataset.anime_prm,
									)}
								>
									{pagenationRoot.dataset.is_arrow && (
										<StyleButton
											attributes={JSON.parse(
												pagenationRoot.dataset.back_attributes,
											)}
										>
											<button
												onClick={() => {
													if (currentPage > 0) {
														currentPage--;
														pickupChange(pickup, fillFlg, currentPage);
													}
												}}
											>
												<div></div>
											</button>
										</StyleButton>
									)}

									<React.Fragment>
										{pagenationButtons(totalPages)}
									</React.Fragment>

									{pagenationRoot.dataset.is_arrow && (
										<StyleButton
											attributes={JSON.parse(
												pagenationRoot.dataset.forward_attributes,
											)}
										>
											<button
												onClick={() => {
													if (currentPage < totalPages - 1) {
														currentPage++;
														pickupChange(pickup, fillFlg, currentPage);
													}
												}}
											>
												<div></div>
											</button>
										</StyleButton>
									)}
								</div>
							</div>
						</StyleGroup>,
					);
				} else {
					//ページネーションを消去
					pagention.render(
						<StyleGroup
							attributes={JSON.parse(pagenationRoot.dataset.group_attributes)}
						/>,
					);
				}
			}
		})
		.catch((error) => console.error(error));
};

//documentの読み込み後に処理
document.addEventListener("DOMContentLoaded", () => {
	//PickUp Postを取得
	const pickupElement = document.querySelectorAll(
		".wp-block-itmar-pickup-posts",
	);

	//pickupに応じてページネーションの操作によるページを表示
	pickupElement.forEach((pickup) => {
		if (pickup.parentElement.classList.contains("swiper-wrapper")) {
			// まずpickupの親要素を取得
			const parentElement = pickup.parentElement;

			// 親要素の子供の中からクラス名に'swiper-slide'が含まれる要素を取得
			const swiperSlides = Array.from(parentElement.children).filter(
				(child) => child !== pickup && child.classList.contains("swiper-slide"),
			);
			// 'unit_hide' クラスをswiper-slide要素に追加
			swiperSlides.forEach((slide) => {
				slide.classList.add("unit_hide");
			});
			//swiperにデータ注入
			pickupChange(pickup, true);
		} else {
			//１ページ目を表示
			pickupChange(pickup, false, 0);
		}
	});
	//フィルタ設定用のブロックを取得
	const filterContainer = document.querySelector(".wp-block-itmar-post-filter");
	const filterId = filterContainer?.dataset.selected_id; //フィルタブロックに設定されたピックアップブロックのID

	const pickup = Array.from(pickupElement).find(
		(element) => element.getAttribute("data-pickup_id") === filterId,
	); //フィルタ設定ブロックに対応するピックアップブロック
	const pickupSlug = pickup?.dataset.selected_slug; //picupブロックから投稿タイプのスラッグを取得
	const fillFlg = pickup?.parentElement.classList.contains("swiper-wrapper"); //picupブロックからデータ埋め込みのタイプを取得

	if (filterContainer) {
		//データベース上のタクソノミーとタームの設定を確認
		restTaxonomies(pickupSlug)
			.then((response) => {
				const taxArray = response.map((res) => {
					return {
						value: res.slug,
						label: res.name,
						terms: res.terms,
					};
				});
				//インナーブロック内のチェックボックスを抽出
				const checkboxes = filterContainer.querySelectorAll(
					'.itmar_filter_checkbox input[type="checkbox"]',
				);
				// taxArrayからすべてのterm nameを抽出
				const allTermNames = taxArray.flatMap((tax) =>
					tax.terms.map((term) => term.slug),
				);

				// checkboxesを配列に変換し、各要素をチェック
				Array.from(checkboxes).forEach((checkbox) => {
					const checkboxName = checkbox.getAttribute("name");

					// checkboxのname属性がallTermNamesに含まれていない場合、要素を削除
					if (!allTermNames.includes(checkboxName)) {
						const filterCheckboxElement = checkbox.closest(
							".itmar_filter_checkbox",
						);
						if (filterCheckboxElement && filterCheckboxElement.parentElement) {
							filterCheckboxElement.parentElement.remove();
						}
					}
				});
				//post-filterブロック内のitmar_filter_checkboxのチェックボックスを監視するリスナー
				checkboxes.forEach((checkbox) => {
					checkbox.addEventListener("change", function () {
						const checkedArray = Array.from(checkboxes)
							.filter((checkbox) => checkbox.checked)
							.map((checkbox) => {
								//チェックボックスが含まれるグループからクラス名を抽出（それがタクソノミー）
								const parentGroup = checkbox.closest(
									".wp-block-itmar-design-group",
								);
								if (parentGroup) {
									const classes = Array.from(parentGroup.classList);
									const taxonomy = classes.find(
										//wp-block-itmar-design-groupでないクラス名
										(cls) => cls !== "wp-block-itmar-design-group",
									);
									if (taxonomy) {
										// taxArrayから一致する要素を探す
										const matchingTax = taxArray.find(
											(tax) => tax.value === taxonomy,
										);
										if (matchingTax) {
											// termsから一致するslugを持つ要素を探す
											const matchingTerm = matchingTax.terms.find(
												(term) => term.slug === checkbox.name, //input要素のname属性がタームのスラッグ
											);
											if (matchingTerm) {
												return {
													taxonomy: taxonomy,
													term: {
														id: matchingTerm.id,
														slug: matchingTerm.slug,
													},
												};
											}
										}
									}
								}
								return null;
							})
							.filter((item) => item !== null);
						//チェックされたタームを新しい選択項目としてデータセット
						termQueryObj = checkedArray;

						pickupChange(pickup, fillFlg, 0); //表示ページの変更
					});
				});
				//デザイングループのdateからラジオボタンを抽出
				const dateContainer = document.querySelector(
					".itmar_filter_month, .itmar_filter_year, .itmar_filter_day",
				);
				const name = dateContainer.getAttribute("data-input_name"); // ラジオボタンのname属性

				if (name) {
					const radios = dateContainer.querySelectorAll(
						`input[type="radio"][name="${name}"]`,
					);
					radios.forEach((radio) => {
						radio.addEventListener("change", function () {
							// チェックされているラジオボタンの値を表示（未選択の場合はundefined）
							const checkedRadio = dateContainer.querySelector(
								`input[type="radio"][name="${name}"]:checked`,
							);
							if (checkedRadio) {
								let period = "";
								//カレンダーの時はセレクト要素が抽出できる
								const select = dateContainer.querySelector(
									".itmar_block_select select",
								);
								if (select) {
									const selectedValue =
										select.options[select.selectedIndex].value;
									period = `${selectedValue}/${checkedRadio.value
										.toString()
										.padStart(2, "0")}`;
								} else {
									period = checkedRadio.value;
								}
								const periodObj = getPeriodQuery(period);
								periodQueryObj = { ...periodObj };
							} else {
								periodQueryObj = null;
							}
							pickupChange(pickup, fillFlg, 0); //表示ページの変更
						});
					});
				}
			})
			.catch((error) => {
				console.error("投稿の更新に失敗しました", error);
			});
		//キーワード検索のインプットボックスとボタンを取得
		const searchButton = document.querySelector(
			".itmar_filter_searchbutton button",
		);
		searchButton.addEventListener("click", function () {
			// クリックされたボタンの3代上の親要素を取得
			const greatGrandparent = this.parentElement.parentElement.parentElement;

			// 3代上の親要素の兄弟要素を取得
			const siblings = [...greatGrandparent.parentElement.children].filter(
				(el) => el !== greatGrandparent,
			);
			// 兄弟要素内の.itmar_filter_searchboxを持つ要素を検索
			const siblingWithSearchBox = siblings.find((sibling) =>
				sibling.querySelector(".itmar_filter_searchbox"),
			);

			if (siblingWithSearchBox) {
				const searchBox = siblingWithSearchBox.querySelector(
					".itmar_filter_searchbox",
				);
				// .itmar_filter_searchbox内のtext型input要素を検索
				const inputElement = searchBox.querySelector('input[type="text"]');

				if (inputElement) {
					// input要素の値を取得してグロバール変数に保存
					searchKeyWord = inputElement.value;
					pickupChange(pickup, fillFlg, 0); //表示ページの変更
				}
			}
		});
	}
});
