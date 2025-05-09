# Simple Blog Engine

Современный легковесный генератор статического блога с поддержкой Markdown, оптимизированный для производительности, поисковых систем и удобного обмена контентом.

## Установка

```bash
# Глобальная установка (рекомендуется для создания новых блогов)
npm install -g simple-blog-engine

# Локальная установка в существующий проект
npm install simple-blog-engine
```

## Быстрый старт

### Создание нового блога

```bash
# После глобальной установки
mkdir my-blog && cd my-blog
npm init -y
npm install simple-blog-engine

# Используя стандартную команду
npx simple-blog-engine init

# Или с помощью альтернативной команды
npm run init
```

### Запуск локального сервера разработки

```bash
npx simple-blog-engine serve
# или
npm run dev
```

### Создание нового поста

```bash
npx simple-blog-engine post
# или
npm run post
```

### Сборка статического сайта

```bash
npx simple-blog-engine build
# или
npm run build
```

## Структура проекта

После инициализации будет создана следующая структура:

```
├── blog/                 # Контент блога (сохраняется при обновлении движка)
│   ├── content/          # Markdown контент
│   │   ├── posts/        # Посты блога
│   │   └── about/        # Содержимое страницы "О блоге"
│   ├── templates/        # HTML шаблоны (переопределяют шаблоны по умолчанию)
│   ├── css/              # CSS стили для конкретного блога
│   ├── images/           # Изображения
│   ├── config.json       # Конфигурация сайта
│   └── telegram-iv-template.txt # Шаблон для Telegram Instant View (опционально)
│
└── dist/                 # Сгенерированный статический сайт (результат)
```

## CLI команды

В движке доступна CLI-команда `simple-blog-engine` (соответствующая названию пакета) со следующими подкомандами и опциями:

| Команда                                     | Описание                                        |
|---------------------------------------------|------------------------------------------------|
| `simple-blog-engine build`                  | Генерация статического сайта                    |
| `simple-blog-engine serve`                  | Локальный запуск для разработки                 |
| `simple-blog-engine init`                   | Инициализация нового блога                      |
| `simple-blog-engine post`                   | Создание нового поста (интерактивно)            |

## Конфигурация

Блог настраивается через файл `blog/config.json`. Пример базовой конфигурации:

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
  }
}
```

## Дополнительная документация

Полную документацию можно найти на [GitHub репозитории проекта](https://github.com/region23/simple-blog-engine).

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

Вы не обязаны делать ничего дополнительно, просто отправьте изменения в репозиторий.

## Лицензия

MIT 