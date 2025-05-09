# Simple Blog

Современный легковесный генератор статического блога с поддержкой Markdown, оптимизированный для производительности, поисковых систем и удобного обмена контентом.

## Особенности

- **Генерация статического HTML**: Предварительно отрендеренные HTML файлы для оптимальной производительности и SEO
- **Контент в Markdown**: Написание постов в формате Markdown с метаданными в frontmatter
- **Система шаблонов**: Настраиваемые HTML шаблоны
- **Адаптивный дизайн**: Подход "mobile-first" с адаптивными макетами
- **Темная/Светлая тема**: Автоматическое определение предпочтений системы с возможностью ручного переключения
- **Организация по тегам**: Категоризация постов с помощью тегов
- **Расчет времени чтения**: Автоматическая оценка времени чтения статей
- **Telegram Instant View**: Оптимизированный контент для функции Instant View в Telegram
- **Открытый исходный код**: Легко обновляемый движок, отделенный от контента
- **Модульность**: Полное разделение движка и контента для простого обновления и переноса
- **Удобное создание постов**: Интерактивный CLI для создания новых постов с автоматической генерацией slug
- **Автоматический деплой**: Интеграция с GitHub Pages для автоматической публикации блога

## Установка

```bash
# Глобальная установка (рекомендуется для создания новых блогов)
npm install -g simple-blog-engine

# Локальная установка в существующий проект
npm install simple-blog-engine
```

## Начало работы

### Создание нового блога

```bash
# Создайте директорию для блога
mkdir my-blog && cd my-blog

# Инициализируйте npm проект, если его еще нет
npm init -y

# Инициализируйте новый блог
npx simple-blog-engine init
# или
npm run init
```

### Локальная разработка

```bash
# Запуск сервера для разработки
npm run dev
# или
npx simple-blog-engine serve
```

### Сборка статического сайта

```bash
# Генерация статического сайта
npm run build
# или
npx simple-blog-engine build
```

## Структура проекта

После инициализации будет создана следующая структура файлов:

```
├── blog/                 # Контент блога
│   ├── content/          # Markdown контент
│   │   ├── posts/        # Посты блога
│   │   └── about/        # Содержимое страницы "О блоге"
│   ├── templates/        # HTML шаблоны (переопределяют шаблоны по умолчанию)
│   ├── css/              # CSS стили для конкретного блога
│   ├── images/           # Изображения
│   ├── config.json       # Конфигурация сайта
│   └── telegram-iv-template.txt # Шаблон для Telegram Instant View (опционально)
│
├── .github/              # GitHub Actions для автоматического деплоя
│   └── workflows/        
│       └── github-pages.yml # Конфигурация для деплоя на GitHub Pages
│
├── dist/                 # Сгенерированный статический сайт (результат)
│
├── node_modules/         # Зависимости npm
│
└── package.json          # Настройки проекта и зависимостей
```

## Повседневное использование блога

### Создание и редактирование постов

1. **Создание нового поста**:
   - Вариант 1: Запустите `npm run post` (или `npx simple-blog-engine post`) и введите название статьи в интерактивном режиме
     ```bash
     $ npm run post
     Enter the title for your new post: Мой новый пост о JavaScript
     Creating new post: "Мой новый пост о JavaScript"...
     Post created successfully!
     Path: blog/content/posts/moj-novyj-post-o-javascript.md
     Slug: moj-novyj-post-o-javascript
     ```
   - Название будет автоматически преобразовано в URL-совместимый slug с помощью транслитерации
   - Если пост с таким slug уже существует, к имени файла будет добавлена текущая дата в формате `_DDMMYY`
   - Файл будет создан с заполненной структурой frontmatter

   - Вариант 2: Создайте новый файл `.md` в директории `blog/content/posts/`
   - Добавьте необходимые метаданные в формате frontmatter
   - Напишите контент в формате Markdown

   ```markdown
   ---
   title: "Заголовок вашего поста"
   date: "2023-03-23"
   tags: ["разработка", "markdown"]
   summary: "Краткое описание вашего поста"
   author: "Ваше имя"
   ---

   # Заголовок

   Ваш контент в формате markdown...
   ```

2. **Добавление изображений**:
   - Поместите изображения в директорию `blog/images/`
   - Ссылайтесь на них в постах: `![Описание](/images/ваше-изображение.jpg)`

3. **Редактирование страницы "О блоге"**:
   - Отредактируйте файл `blog/content/about/index.md`

### Настройка блога

1. **Редактирование конфигурации**:
   - Отредактируйте файл `blog/config.json` для изменения:
     - Заголовка и описания блога
     - Языка блога
     - Навигационного меню
     - Настроек внешнего вида (цвета, шрифты)
     - Количества постов на странице

2. **Настройка шаблонов**:
   - Отредактируйте файлы в директории `blog/templates/` для изменения HTML структуры
   - Основные шаблоны:
     - `base.html` - Базовый шаблон всех страниц
     - `header.html` - Шапка сайта
     - `footer.html` - Подвал сайта
     - `post.html` - Шаблон отдельного поста
     - `post-card.html` - Шаблон превью поста на главной странице

3. **Настройка стилей**:
   - Отредактируйте файлы в директории `blog/css/` для изменения визуального стиля
   - Основные файлы стилей:
     - `all.css` - Основной файл со всеми компонентами и стилями
     - `generated.css` - CSS переменные (автоматически генерируются из конфигурации)

### Настройка стилей

Стили в блоге построены на модульной структуре из двух основных файлов:

1. **generated.css** - Автоматически генерируется на основе настроек из `blog/config.json`. Содержит CSS переменные для:
   - Цветовой схемы (основные цвета, акцентные цвета, темная тема)
   - Типографики (шрифты, размеры)
   - Отступов и размеров
   - Эффектов и анимаций
   
   > Важно: этот файл не нужно редактировать вручную, все изменения делаются в разделе `appearance` файла `blog/config.json`

2. **all.css** - Основной файл стилей, содержащий все компоненты:
   - Базовые стили и сбросы
   - Типографику
   - Компоненты (кнопки, карточки, навигация)
   - Макеты и сетки
   - Утилиты

Оба файла размещаются в директории `blog/css/` и напрямую подключаются в шаблоне:

```html
<link rel="stylesheet" href="/css/generated.css">
<link rel="stylesheet" href="/css/all.css">
```

### Сборка и публикация

1. **Локальная разработка**:
   - Запустите `npm run dev` для локального предпросмотра блога
   - Доступен по адресу: http://localhost:3000

2. **Сборка для продакшена**:
   - Запустите `npm run build` для генерации статических файлов
   - Результат будет в директории `dist/`

3. **Отладка сборки**:
   - Используйте флаг `--debug` для детальной информации: `npm run build -- --debug`
   - Это выведет пути, используемые при сборке, и прочую отладочную информацию

## Команды CLI

В движке доступна CLI-команда `simple-blog-engine` (соответствующая названию пакета) со следующими подкомандами и опциями:

| Команда                                  | NPM скрипт         | Описание                                          |
|------------------------------------------|--------------------|----------------------------------------------------|
| `simple-blog-engine build`               | `npm run build`    | Генерация статического сайта                       |
| `simple-blog-engine serve`               | `npm run dev`      | Локальный запуск для разработки                    |
| `simple-blog-engine init`                | `npm run init`     | Инициализация нового блога                         |
| `simple-blog-engine post`                 | `npm run post`      | Создание нового поста (интерактивно)               |

## Скрипты

- `npm run start` - Локальный запуск сгенерированного статического сайта
- `npm run dev` - Сборка сайта и локальный запуск для разработки с автоматическим обновлением
- `npm run build` - Генерация статического сайта для продакшена
- `npm run init` - Инициализация нового блога со стандартными шаблонами и настройками
- `npm run post` - Создание нового шаблона статьи (интерактивный режим)

## Публикация блога на GitHub Pages

Simple Blog Engine автоматически настраивает интеграцию с GitHub Pages при инициализации нового блога. Для публикации вашего блога с автоматической сборкой:

1. Создайте репозиторий на GitHub
2. Настройте GitHub Pages в настройках репозитория:
   - Перейдите в настройки (Settings) → Pages
   - В разделе "Build and deployment" выберите "GitHub Actions" как Source

После настройки просто отправьте ваш код в репозиторий:

```bash
# Инициализация Git репозитория (если еще не сделано)
git init
git add .
git commit -m "Initial commit"

# Связывание с удаленным репозиторием
git remote add origin https://github.com/yourusername/your-blog-repo.git
git push -u origin main
```

GitHub Actions автоматически запустит сборку и опубликует блог на GitHub Pages. Ваш блог будет доступен по адресу:
`https://yourusername.github.io/your-blog-repo/`

### Как это работает

При инициализации блога Simple Blog Engine создает файл `.github/workflows/github-pages.yml`, который:

1. Запускается при каждом пуше в ветки main/master
2. Устанавливает необходимые зависимости
3. Собирает сайт с помощью команды `npm run build`
4. Публикует содержимое директории `dist/` на GitHub Pages

## Обновление движка

Пакет `simple-blog-engine` регулярно обновляется с новыми функциями и исправлениями. Для обновления:

```bash
# Обновите пакет до последней версии
npm update simple-blog-engine

# Или установите конкретную версию
npm install simple-blog-engine@x.y.z
```

Ваш контент в директории `blog/` останется неизменным при обновлении движка.

## Конфигурация

Сайт настраивается через файл `blog/config.json`. Пример конфигурации:

```json
{
  "site": {
    "title": "Название вашего блога",
    "description": "Описание вашего блога",
    "language": "ru",
    "copyright": "© 2025 Название вашего блога"
  },
  "navigation": {
    "items": [
      {"label": "Блог", "url": "/", "active": true},
      {"label": "Теги", "url": "/tags"},
      {"label": "О блоге", "url": "/about"}
    ]
  },
  "social": {
    "links": [
      {"platform": "GitHub", "url": "https://github.com/your_github_username"},
      {"platform": "Twitter", "url": "https://twitter.com/your_twitter_username"},
      {"platform": "LinkedIn", "url": "https://linkedin.com/in/your_linkedin_username"}
    ]
  },
  "appearance": {
    "colors": {
      "primary": "#18181b",
      "secondary": "#64748b",
      "accent": "#3b82f6",
      "background": "#fafafa",
      "surface": "#fafafa",
      "text": "#1e293b",
      "border": "#e2e8f0"
    },
    "darkMode": {
      "background": "#121212",
      "surface": "#1e1e1e",
      "text": "#e2e8f0",
      "secondary": "#94a3b8",
      "border": "#2d3748"
    },
    "fonts": {
      "main": "Inter",
      "code": "JetBrains Mono"
    }
  },
  "content": {
    "postsPerPage": 7,
    "showReadingTime": true,
    "defaultAuthor": "",
    "wordsPerMinute": 200
  }
}
```

Поле `defaultAuthor` можно оставить пустым для авторского блога или указать имя автора, если в постах не указывается это поле явно.

## Лицензия

MIT 