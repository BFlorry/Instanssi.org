# -*- coding: utf-8 -*-

from django.conf.urls import url
from Instanssi.ext_blog.views import BlogFeed, BlogFeedAll

urlpatterns = [
    url(r'^(?P<event_id>\d+)/rss/$', BlogFeed(), name="rss_single"),
    url(r'^rss/$', BlogFeedAll(), name="rss"),
]
