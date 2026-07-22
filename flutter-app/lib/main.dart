import 'package:flutter/material.dart';

import 'app/app.dart';
import 'core/mock/mock_data.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(DalanBookApp(state: AppState()));
}
