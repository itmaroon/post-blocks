<?php
	//blockからの情報取得
	$wrapper_attributes = get_block_wrapper_attributes();
	$args = array(
		'numberposts'	=> $attributes['numberOfItems'],
	);
	$styles = isset($attributes['cssStyles']) ? $attributes['cssStyles'] : '';
	$style_class = isset($attributes['styleClass']) ? $attributes['styleClass'] : '';
	$additional_styles = "background-color: {$attributes['bgColor']}; overflow: hidden;";
 
	$output = "<div {$wrapper_attributes} style='$additional_styles'>";//ブロックのラッパー
	$output .= "<div class='{$style_class}'>";//スタイルのラッパー

	$picup_posts = get_posts( $args );
	if( ! empty( $picup_posts ) ){
		$output .= '<ul class="post_items">';
 
		foreach ( $picup_posts as $p ){
			$title = $p->post_title ? $p->post_title : __( 'No title', 'itmar_post_blocks' );
			$url = esc_url( get_permalink( $p->ID ) );
			$thumbnail = has_post_thumbnail( $p->ID ) ? get_the_post_thumbnail( $p->ID, 'medium' ) : '';
 
			$output .= '<li>';
			if( ! empty( $thumbnail ) && $attributes['displayThumbnail'] ){
				$output .= '<a href="' . $url . ' class="post_thumbnail_link">' . $thumbnail . '</a>';
			}
			$output .= '<h3 class="post_title">';
			$output .= '<a href="' . $url . '">' . $title . '</a>';
			$output .= '</h3>';
			if( $attributes['displayDate'] ){
				$output .= '<time className="post-date" datetime="' . esc_attr( get_the_date( 'c', $p->ID ) ) .'">' . esc_html( get_the_date( 'Y.n.j', $p->ID ) ) . '</time>';
			}
			$output .= '</li>';

		}
		$output .= '</ul>';
	} else {
		$output .= sprintf( '<p>%1$s</p>', __( 'Sorry. No posts matching your criteria!', 'itmar_post_blocks' ) );
	}
 
	$output .= '</div></div>';

	echo $styles;  // スタイルタグを出力
	echo $output;
