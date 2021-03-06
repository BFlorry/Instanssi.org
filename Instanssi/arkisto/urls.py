# -*- coding: utf-8 -*-

from django.conf.urls import url
from Instanssi.arkisto.views import index, entry, event, video, text_event, json_event

urlpatterns = [
    url(r'^$', index, name="index"),
    url(r'^entry/(?P<entry_id>\d+)/', entry, name="entry"),
    url(r'^text_event/(?P<event_id>\d+)/', text_event, name="text_event"),
    url(r'^json_event/(?P<event_id>\d+)/', json_event, name="json_event"),
    url(r'^event/(?P<event_id>\d+)/', event, name="event"),
    url(r'^video/(?P<video_id>\d+)/', video, name="video"),
]
