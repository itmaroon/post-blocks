=== Query Blocks ===
Contributors:      itmaroon
Tags:              block, post, taxsonomy, field, query
Requires at least: 6.4
Tested up to:      7.1
Stable tag:        2.0.3
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html
Requires PHP: 8.2.10

This is a collection of blocks that display WordPress posts. It includes blocks for selectively displaying posts, setting selection, pagination, and displaying settings.

== Related Links ==

* [query-blocks:Github](https://github.com/itmaroon/query-blocks)
* [block-class-package:GitHub](https://github.com/itmaroon/block-class-package)  
* [block-class-package:Packagist](https://packagist.org/packages/itmar/block-class-package) 
* [itmar-block-packages:npm](https://www.npmjs.com/package/itmar-block-packages)  
* [itmar-block-packages:GitHub](https://github.com/itmaroon/itmar-block-packages)

== Description ==

When you install this plugin, the following four blocks are registered and can be used not only in the block editor but also in the site editor.

1. Post Pickup
Provides a function to pick up WordPress post data. Internally, it generates a subquery to extract data from the database. The extracted data is selected by selecting the post type and term, and the required fields are rendered by selecting the field. Custom fields can also be selected.

2. Post Filter
This block provides a UI for users to filter Post Pickups specified by ID. There are three types of filtering:
- Provides a filtering function by string search. The search targets are title, excerpt, and body text, but custom fields can also be targeted by selecting an option.
- Provides a filtering function for data posted within a set period. The period can be set to three types: year, month, and day.
- Provides a filtering function by terms set in posts. The terms to be filtered are selected by selecting the taxonomy associated with the post type.

3. Post Pagination
This block provides pagination display of Post Pickup specified by ID.
Two types are available: one that displays the page number and one that moves to the previous or next page. The type that displays the page number has Design Button as an inner block,
and the type that moves to the previous or next page has Design Title as an inner block.
Various customizations are possible by utilizing the design functions of these custom blocks.

4. Post Crumbs
This block displays the filtering information of Post Pickup specified by ID in the form of a breadcrumb list.
The filtering information is based on filtering by Post Filter and is displayed as the text of Design Title.
Therefore, various customizations are possible by using the design function of Design Title.
In addition, when Post Pickup is displayed as a single post, the title of the post is also displayed in addition to the filtering information.

== Installation ==

1. From the WP admin panel, click “Plugins” -> “Add new”.
2. In the browser input box, type “Query Blocks”.
3. Select the “Query Blocks” plugin and click “Install”.
4. Activate the plugin.

OR…

1. Download the plugin from this page.
2. Save the .zip file to a location on your computer.
3. Open the WP admin panel, and click “Plugins” -> “Add new”.
4. Click “upload”.. then browse to the .zip file downloaded from this page.
5. Click “Install”.. and then “Activate plugin”.



== Frequently Asked Questions ==



== Screenshots ==

1. Display multiple posts in Post Pickup
2. Display posts in order of popularity with Post Pickup
3. Display filtering information in breadcrumb format with Post Crumbs
4. Post Filter filter setting screen (period filter is displayed by month)
5. Post Filter filter setting screen (period filter is displayed by year)
6. Post Filter filter setting screen (period filter is displayed by day)
7. Post Pagination page number display
8. Post Pagination forward/backward navigation

== Changelog ==
= 2.0.3 =
- Fixed retrieval of selected ACF group fields when migrated posts do not contain the parent field reference metadata.
- Updated the bundled `itmar-block-packages` dependency to version 3.2.4 so taxonomy filters can load their items on the front end.

= 2.0.2 =
- Composer component fixed.

= 2.0.1 =
- Converted JavaScript to TypeScript.

= 1.1.2 =
- We have taken performance into consideration by limiting the process of rewriting the block contents to only when there is a change in the block contents.

= 1.1.1 =
- Added a data-post-id attribute to each DOM element of front-end post data to record the post ID.

= 1.1.0 =
- Regarding the method of loading composer components, a mechanism has been introduced that does not conflict with other plugins. Accordingly, the composer components have been updated.
- Operation check with WordPress 6.8

= 1.0.2 =
- Fixed the issue where the icon inverted display was not displayed properly when selecting a block.

= 1.0.1 =
Fixed a bug in Post Pickup where the selection button was not displayed when the featured image was not set for the first post.

= 1.0.0 =
* Release

== Arbitrary section ==
1. PHP class management is now done using Composer.  
[GitHub](https://github.com/itmaroon/block-class-package)  
[Packagist](https://packagist.org/packages/itmar/block-class-package)
 
2. I decided to make functions and components common to other plugins into npm packages, and install and use them from npm.  
[npm](https://www.npmjs.com/package/itmar-block-packages)  
[GitHub](https://github.com/itmaroon/itmar-block-packages)

== External services ==  
This plugin connects to the API to get holiday information. This is necessary to display the names of holidays in the displayed calendar.
This service is provided by "Google LLC". The terms of use and privacy policy are available at the following links:
[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy?hl=ja)
[Google Calendar Partner Program Terms of Use](https://www.google.co.jp/googlecalendar/partner_program_policies.html)
[Google Privacy Policy](https://policies.google.com/privacy?hl=ja)
[Google Calendar Privacy Basics](https://support.google.com/calendar/answer/10366125?hl=ja)
