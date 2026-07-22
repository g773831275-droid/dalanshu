import 'package:flutter/foundation.dart';

class PostData {
  const PostData({
    required this.title,
    required this.author,
    required this.body,
    required this.image,
    required this.tag,
    this.likes = 328,
    this.comments = 24,
  });

  final String title;
  final String author;
  final String body;
  final String image;
  final String tag;
  final int likes;
  final int comments;
}

class IslandData {
  const IslandData({
    required this.name,
    required this.subtitle,
    required this.image,
    required this.members,
    required this.category,
  });

  final String name;
  final String subtitle;
  final String image;
  final String members;
  final String category;
}

const posts = [
  PostData(
    title: '我用了 30 天 AI Agent，留下这 4 个场景',
    author: '林深',
    body: '从自动整理周报，到把灵感变成清单，记录几个真正留在工作流里的做法。工具会更新，但能留下来的，是一套可复用的思考方式。',
    image: 'assets/images/cover-ai-desk.jpg',
    tag: '真实复盘',
  ),
  PostData(
    title: '从 92kg 到 78kg：上班族减脂真实复盘',
    author: 'Chris',
    body: '没有极端节食，也没有每天两小时训练。把目标拆成今天能完成的一小步，才是真的长期主义。',
    image: 'assets/images/cover-gym.jpg',
    tag: '训练笔记',
    likes: 486,
    comments: 38,
  ),
  PostData(
    title: '手写复盘 100 天后，我留下这套模板',
    author: '夜航船',
    body: '每天给自己十分钟，把今天做成一页小小的地图。回头看时，原来那些散落的片段已经变成了方向。',
    image: 'assets/images/cover-notebook.jpg',
    tag: '长期主义',
    likes: 341,
    comments: 19,
  ),
  PostData(
    title: '3000 元做一套安静桌搭，我踩过的坑',
    author: '老周的桌面',
    body: '从灯光、收纳到一把真正舒服的椅子，分享一套不追求参数但足够耐用的桌面方案。',
    image: 'assets/images/cover-desk-setup.jpg',
    tag: '装备清单',
    likes: 188,
    comments: 12,
  ),
];

const islands = [
  IslandData(
    name: 'AI 工具岛',
    subtitle: '工具、自动化流程与真实效率经验。',
    image: 'assets/images/cover-ai-desk.jpg',
    members: '12.8 万岛民',
    category: 'AI 工具',
  ),
  IslandData(
    name: '职场成长岛',
    subtitle: '从入职到晋升，聊真实的选择与复盘。',
    image: 'assets/images/cover-portrait-pm.jpg',
    members: '8.6 万岛民',
    category: '职场成长',
  ),
  IslandData(
    name: '户外兴趣岛',
    subtitle: '徒步、露营、骑行的路线笔记与装备清单。',
    image: 'assets/images/cover-outdoor.jpg',
    members: '3.7 万岛民',
    category: '户外兴趣',
  ),
  IslandData(
    name: '阅读与写作岛',
    subtitle: '读书笔记、写作训练与思维方法的长期实践。',
    image: 'assets/images/cover-notebook.jpg',
    members: '2.7 万岛民',
    category: '阅读写作',
  ),
];

class AppState extends ChangeNotifier {
  bool isLoggedIn = false;
  bool notificationsRead = false;
  final Set<String> joinedIslands = <String>{};
  final Set<String> likedPosts = <String>{};
  final Set<String> savedPosts = <String>{};
  final Set<String> followedAuthors = <String>{};

  void login() {
    isLoggedIn = true;
    notifyListeners();
  }

  void logout() {
    isLoggedIn = false;
    notifyListeners();
  }

  void toggleIsland(String name) {
    if (!joinedIslands.add(name)) joinedIslands.remove(name);
    notifyListeners();
  }

  void toggleLike(String title) {
    if (!likedPosts.add(title)) likedPosts.remove(title);
    notifyListeners();
  }

  void toggleSaved(String title) {
    if (!savedPosts.add(title)) savedPosts.remove(title);
    notifyListeners();
  }

  void toggleFollow(String author) {
    if (!followedAuthors.add(author)) followedAuthors.remove(author);
    notifyListeners();
  }

  void markNotificationsRead() {
    notificationsRead = true;
    notifyListeners();
  }
}
