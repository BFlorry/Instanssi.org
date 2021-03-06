# -*- coding: utf-8 -*-

from django.conf.urls import url
from Instanssi.admin_blog.views import index, delete, edit

urlpatterns = [
    url(r'^$', index, name="index"),
    url(r'^delete/(?P<entry_id>\d+)/', delete, name="delete"),
    url(r'^edit/(?P<entry_id>\d+)/', edit, name="edit"),
]
