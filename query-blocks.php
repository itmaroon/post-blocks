<?php

/**
 * Plugin Name:       Query Blocks
 * Plugin URI:        https://itmaroon.net
 * Description:       A collection of blocks that display WordPress posts
 * Requires at least: 6.4
 * Requires PHP:      8.1.22
 * Version:           2.0.3
 * Author:            Web Creator ITmaroon
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       query-blocks
 * Domain Path:       /languages
 *
 * @package           itmar
 */

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */

//PHPファイルに対する直接アクセスを禁止
if (!defined('ABSPATH')) exit;

// プラグイン情報取得に必要なファイルを読み込む
if (!function_exists('get_plugin_data')) {
	require_once(ABSPATH . 'wp-admin/includes/plugin.php');
}

require_once __DIR__ . '/vendor/itmar/loader-package/src/register_autoloader.php';

use Itmar\BlockClassPackage\ItmarAccessClass;

$block_entry = new \Itmar\BlockClassPackage\ItmarEntryClass();


//ブロックの登録
add_action('init', function () use ($block_entry) {
	$plugin_data = get_plugin_data(__FILE__);
	$block_entry->block_init($plugin_data['TextDomain'], __FILE__);
});

// 依存するプラグインが有効化されているかのアクティベーションフック
register_activation_hook(__FILE__, function () use ($block_entry) {
	$plugin_data = get_plugin_data(__FILE__);
	$block_entry->activation_check($plugin_data, ['block-collections']); // ここでメソッドを呼び出し
});

// 管理画面での通知フック
add_action('admin_notices', function () use ($block_entry) {
	$plugin_data = get_plugin_data(__FILE__);
	$block_entry->show_admin_dependency_notices($plugin_data, ['block-collections']);
});

//アクセスカウンターのセット
function itmar_register_access_counter()
{
	$counter = new ItmarAccessClass();
	$counter->hook();
}
add_action('plugins_loaded', 'itmar_register_access_counter');

function itmar_query_blocks_front()
{
	//管理画面以外（フロントエンド側でのみ読み込む）
	if (!is_admin()) {
		if (is_singular()) {
			global $post;
			$slug = $post->post_name;


			// JavaScriptにスラッグを渡す
			wp_localize_script('itmar-script-handle', 'itmar_post_option', array(
				'slug' => $slug,
			));
		}
	}
}

add_action('enqueue_block_assets', 'itmar_query_blocks_front');

//シングルページのデータ取得のためのカスタムエンドポイント
add_action('rest_api_init', function () {
	register_rest_route('itmar-rest-api/v1', '/single-post', [
		'methods' => 'GET',
		'callback' => function () {
			// 現在の投稿を取得
			global $post;
			if (is_single() && isset($post)) {
				$post_id = $post->ID;

				// 投稿データを取得
				$post_data = get_post($post_id);

				if ($post_data) {
					return [
						'id'      => $post_data->ID,
						'title'   => $post_data->post_title,
					];
				}
			}

			return new WP_Error('no_post', '投稿が見つかりません', ['status' => 404]);
		},
		'permission_callback' => '__return_true',
	]);
});


//検索のためのカスタムエンドポイント
add_action('rest_api_init', function () {
	register_rest_route('itmar-rest-api/v1', '/search', array(
		'methods' => 'GET',
		'callback' => 'itmar_search_endpoint',
		'permission_callback' => '__return_true' //常に許可
	));
});

function itmar_search_endpoint($request)
{
	//global $wpdb;
	//各種パラメータの取得
	$search_term = $request->get_param('search');
	$post_type = $request->get_param('post_type') ? $request->get_param('post_type') : 'post';
	$per_page = $request->get_param('per_page') ? (int) $request->get_param('per_page') : 10;
	$page = $request->get_param('page') ? (int) $request->get_param('page') : 1;
	$tax_relation = $request->get_param('tax_relation') ? strtoupper($request->get_param('tax_relation')) : 'AND';
	$orderby = $request->get_param('orderby');
	$order = $request->get_param('order');
	$after = $request->get_param('after');
	$before = $request->get_param('before');
	$meta_key = $request->get_param('meta_key') ? $request->get_param('meta_key') : null;

	// 選択したカスタムフィールドを取得
	$choice_fields_prm = $request->get_param('custom_fields');
	$custom_fields = explode(',', $choice_fields_prm);
	$meta_fields = array_map(function ($field) {
		return str_replace('meta_', '', $field);
	}, array_filter($custom_fields, function ($field) {
		return strpos($field, 'meta_') === 0;
	}));
	$acf_fields = array_values(array_unique(array_map(function ($field) {
		// グループ配下の指定（例: acf_prices.list_price）は親フィールドを取得する
		$field_path = substr($field, 4);
		return explode('.', $field_path, 2)[0];
	}, array_filter($custom_fields, function ($field) {
		return strpos($field, 'acf_') === 0;
	}))));

	// 検索対象にしたいカスタムフィールドを取得
	$custom_fields_prm = $request->get_param('search_fields');
	$custom_fields = array();
	if ($custom_fields_prm != "") {
		$custom_fields = explode(',', $custom_fields_prm);
	}

	$args = array(
		'post_type' => $post_type,
		'posts_per_page' => $per_page,
		'paged' => $page,
		'orderby' => $orderby,
		'order' => $order,
		'post_status' => 'publish',
		//'apply_custom_search_filter' => true
	);

	// meta_key が null でない場合に追加
	if ($meta_key !== null) {
		$args['meta_key'] = $meta_key;
	}


	// 検索クエリの追加
	if (!empty($search_term)) {
		// タイトル、本文、抜粋の検索を追加
		$args['s'] = $search_term;
		// メタクエリの作成
		if (count($custom_fields) > 0) {
			$meta_query = array('relation' => 'OR');
			foreach ($custom_fields as $field) {
				$meta_query[] = array(
					'key' => $field,
					'value' =>  $search_term,
					'compare' => 'LIKE',
					'type'    => 'CHAR'
				);
			}

			$args['meta_query'] = $meta_query;
			$args['apply_custom_search_filter'] = true; // カスタムフラグを追加
		}
	}

	// 日付範囲クエリの追加
	$date_query = array();

	if (!empty($after)) {
		$date_query['after'] = $after;
	}

	if (!empty($before)) {
		$date_query['before'] = $before;
	}

	if (!empty($date_query)) {
		$args['date_query'] = $date_query;
	}

	// タクソノミーパラメータの取得
	$taxonomy_params = array();
	$registered_taxonomies = get_taxonomies(array('public' => true), 'names');
	foreach ($registered_taxonomies as $taxonomy) {
		$tax_value = $request->get_param($taxonomy);
		if ($tax_value !== null) {
			$taxonomy_params[$taxonomy] = $tax_value;
		}
	}

	// タクソノミークエリの構築
	$tax_query = array();
	foreach ($taxonomy_params as $taxonomy => $terms) {
		$terms_array = explode(',', $terms);
		$field = 'term_id'; // デフォルトはterm_id

		// タームの種類を判断
		$first_term = trim($terms_array[0]);
		if (!is_numeric($first_term)) {
			// 数値でない場合はスラッグとして扱う
			$field = 'slug';
		} else {
			// 数値の場合でも、実際にterm_idが存在するか確認
			$term = get_term($first_term, $taxonomy);
			if (!$term || is_wp_error($term)) {
				// term_idが存在しない場合はスラッグとして扱う
				$field = 'slug';
			}
		}

		$tax_query[] = array(
			'taxonomy' => $taxonomy,
			'field' => $field,
			'terms' => $terms_array,
		);
	}
	//複数のタクソノミが設定されているときはその関係を設定
	if (count($tax_query) > 1) {
		$tax_query['relation'] = $tax_relation;
	}

	if (!empty($tax_query)) {
		$args['tax_query'] = $tax_query;
	}



	// クエリの実行
	$query = new WP_Query($args);

	$posts = array();
	if ($query->have_posts()) {
		while ($query->have_posts()) {
			$query->the_post();
			$post_id = get_the_ID();

			// 投稿データの取得
			$post_data = array(
				'id' => $post_id,
				'date' => get_the_date('c'),
				'date_gmt' => get_the_date('c', get_the_ID()),
				'guid' => array('rendered' => get_the_guid()),
				'modified' => get_the_modified_date('c'),
				'modified_gmt' => get_the_modified_date('c', get_the_ID()),
				'slug' => get_post_field('post_name', $post_id),
				'status' => get_post_status(),
				'type' => get_post_type(),
				'link' => get_permalink(),
				'title' => array('rendered' => get_the_title()),
				'content' => array('rendered' => apply_filters('the_content', get_the_content())),
				'excerpt' => array('rendered' => get_the_excerpt()),
				'author' => (int) get_the_author_meta('ID'),
				'featured_media' => get_post_thumbnail_id($post_id),
				'comment_status' => get_post_field('comment_status', $post_id),
				'ping_status' => get_post_field('ping_status', $post_id),
				'sticky' => is_sticky($post_id),
				'template' => get_page_template_slug($post_id),
				'format' => get_post_format($post_id) ?: 'standard',
				//'meta' => array(),
				'categories' => wp_get_post_categories($post_id, array('fields' => 'ids')),
				'tags' => wp_get_post_tags($post_id, array('fields' => 'ids')),
				'taxonomies' => get_object_taxonomies(get_post_type($post_id), 'names')
			);

			// タームの値を追加
			foreach ($post_data['taxonomies'] as $tax) {
				$terms = wp_get_post_terms($post_id, $tax);
				$post_data['terms'][$tax] = $terms;
			}

			// カスタムフィールドの値を追加
			foreach ($meta_fields as $field) {
				$post_data['meta'][$field] = get_post_meta($post_id, $field, true);
			}

			// ACFフィールドがある場合
			if (function_exists('get_fields')) {
				// 既存レスポンスとの互換性を保ちつつ、選択されたフィールドは明示的に取得する。
				// get_fields() だけでは、親の参照メタがないグループフィールドが欠落する場合がある。
				$all_acf_fields = get_fields($post_id);
				if ($all_acf_fields) {
					$post_data['acf'] = $all_acf_fields;
				}
				if (function_exists('get_field')) {
					// 投稿に適用されるフィールド定義を名前からフィールドキーへ対応付ける。
					// 親フィールドの参照メタがない環境でも、キー指定ならグループ値を復元できる。
					$acf_field_keys = array();
					if (function_exists('acf_get_field_groups') && function_exists('acf_get_fields')) {
						$field_groups = acf_get_field_groups(array('post_id' => $post_id));
						foreach ($field_groups as $field_group) {
							$group_fields = acf_get_fields($field_group);
							if (!$group_fields) {
								continue;
							}
							foreach ($group_fields as $group_field) {
								if (!empty($group_field['name']) && !empty($group_field['key'])) {
									$acf_field_keys[$group_field['name']] = $group_field['key'];
								}
							}
						}
					}

					foreach ($acf_fields as $field) {
						$field_selector = isset($acf_field_keys[$field]) ? $acf_field_keys[$field] : $field;
						$post_data['acf'][$field] = get_field($field_selector, $post_id);
					}
				}
			}

			$posts[] = $post_data;
		}
	}

	wp_reset_postdata();

	$response = array(
		'total' => $query->found_posts,
		'pages' => $query->max_num_pages,
		'current_page' => $page,
		'posts' => $posts
	);

	return new WP_REST_Response($response, 200);
}

// メタクエリとデフォルトの検索を結合するカスタムフィルター
function itmar_combine_searches($sql, $query)
{
	global $wpdb;
	// カスタムフラグをチェック
	if ($query->get('apply_custom_search_filter')) {
		$search_term = $query->get('s');

		if (!empty($search_term)) {
			$meta = $query->get('meta_query');
			$target_custom_fields = itmar_extract_custom_fields($meta); // 検索対象のカスタムフィールド
			if (count($target_custom_fields) > 0) {
				// SQLクエリからWHERE句を抽出
				preg_match('/WHERE\s+((?:(?!GROUP BY|ORDER BY|LIMIT).)+)/is', $sql, $matches);

				if (isset($matches[1])) {
					$where_clause = $matches[1];

					// WHERE句を分割
					$conditions = itmar_split_where_clause($where_clause);

					// 新しい検索条件を構築
					$search_conditions = array();
					$search_conditions[] = $wpdb->prepare("(wp_posts.post_title LIKE %s)", '%' . $wpdb->esc_like($search_term) . '%');
					$search_conditions[] = $wpdb->prepare("(wp_posts.post_excerpt LIKE %s)", '%' . $wpdb->esc_like($search_term) . '%');
					$search_conditions[] = $wpdb->prepare("(wp_posts.post_content LIKE %s)", '%' . $wpdb->esc_like($search_term) . '%');

					foreach ($target_custom_fields as $field) {
						$search_conditions[] = $wpdb->prepare(
							"(wp_postmeta.meta_key = %s AND wp_postmeta.meta_value LIKE %s)",
							$field,
							'%' . $wpdb->esc_like($search_term) . '%'
						);
					}

					$new_search_condition = '(' . implode(' OR ', $search_conditions) . ')';

					// 既存の検索条件を新しい条件に置き換え
					$new_conditions = array();
					foreach ($conditions as $condition) {
						if (
							strpos($condition, 'wp_posts.post_title LIKE') === false &&
							strpos($condition, 'wp_posts.post_excerpt LIKE') === false &&
							strpos($condition, 'wp_posts.post_content LIKE') === false &&
							strpos($condition, 'wp_postmeta.meta_key =') === false
						) {
							$new_conditions[] = $condition;
						}
					}

					// 新しい検索条件を追加
					array_unshift($new_conditions, $new_search_condition);

					// WHERE句を再構築
					$new_where_clause = implode(' AND ', $new_conditions);

					// 元のSQLクエリのWHERE句を新しいものに置き換え
					$sql = preg_replace('/WHERE\s+(?:(?!GROUP BY|ORDER BY|LIMIT).)+/is', "WHERE $new_where_clause", $sql);
				}
			}
		}
	}
	return $sql;
}
add_filter('posts_request', 'itmar_combine_searches', 10, 2);

//WHERE句をANDごとに分割する関数（AND()ごとに分割）
function itmar_split_where_clause($where_clause)
{
	$conditions = array();
	$current_condition = '';
	$paren_count = 0;
	$tokens = preg_split('/(AND|\(|\))/', $where_clause, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);

	foreach ($tokens as $token) {
		$token = trim($token);
		if ($token === '(') {
			$paren_count++;
		} elseif ($token === ')') {
			$paren_count--;
		}

		if ($token === 'AND' && $paren_count === 0) {
			if (!empty($current_condition)) {
				$conditions[] = trim($current_condition);
				$current_condition = '';
			}
		} else {
			$current_condition .= ' ' . $token;
		}
	}

	if (!empty($current_condition)) {
		$conditions[] = trim($current_condition);
	}

	return $conditions;
}

//カスタムフィールド名を配列として取り出し
function itmar_extract_custom_fields($meta_query)
{
	$fields_array = array();
	if (is_array($meta_query)) {
		foreach ($meta_query as $query) {
			if (isset($query['key'])) {
				$fields_array[] = $query['key'];
			} elseif (is_array($query)) {
				$fields_array = array_merge($fields_array, itmar_extract_custom_fields($query));
			}
		}
	}
	return array_unique($fields_array);
}
