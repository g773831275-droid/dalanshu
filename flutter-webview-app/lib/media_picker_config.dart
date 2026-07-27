enum AcceptedMediaType { image, video, mixed, unsupported }

AcceptedMediaType acceptedMediaType(List<String> acceptTypes) {
  final types = acceptTypes
      .expand((value) => value.split(','))
      .map((value) => value.trim().toLowerCase())
      .where((value) => value.isNotEmpty)
      .toList();
  if (types.isEmpty || types.contains('*/*')) {
    return AcceptedMediaType.mixed;
  }
  final acceptsImages = types.any((type) => type.startsWith('image/'));
  final acceptsVideos = types.any((type) => type.startsWith('video/'));
  if (acceptsImages && acceptsVideos) {
    return AcceptedMediaType.mixed;
  }
  if (acceptsImages) {
    return AcceptedMediaType.image;
  }
  if (acceptsVideos) {
    return AcceptedMediaType.video;
  }
  return AcceptedMediaType.unsupported;
}
