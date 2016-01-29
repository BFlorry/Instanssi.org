# -*- coding: utf-8 -*-
# Generated by Django 1.9 on 2016-01-23 19:55
from __future__ import unicode_literals

from django.db import migrations


def forwards(apps, schema_editor):
    TransactionItem = apps.get_model("store", "TransactionItem")
    for ta in TransactionItem.objects.all().iterator():
        ta.original_price = ta.purchase_price
        ta.save()


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0002_auto_20160123_1954'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]